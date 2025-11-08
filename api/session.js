/**
 * Копия серверной функции выдачи sessionID, размещённая рядом с игрой.
 * Позволяет включать API-ручку в сборку дистрибутива (например, при деплое на Vercel).
 */

const STAKE_GRAPHQL_URL = 'https://stake.com/_api/graphql';
const DEFAULT_SLUG = 'mirrorimage-drop-the-boss-trump';
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
const DEBUG = process.env?.OFFLINE_DEBUG_SESSION === '1';

function logDebug(...args) {
  if (DEBUG) {
    console.log('[API][SESSION]', ...args);
  }
}

async function readRequestPayload(request) {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    return {
      slug: url.searchParams.get('slug') || undefined
    };
  }

  if (!request.body) {
    return {};
  }

  const clone = request.clone();
  try {
    const json = await clone.json();
    return json && typeof json === 'object' ? json : {};
  } catch (error) {
    logDebug('Unable to parse JSON body', error);
    return {};
  }
}

function normalizeSlug(value) {
  if (!value || typeof value !== 'string') {
    return DEFAULT_SLUG;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_SLUG;
  }
  return trimmed;
}

function toResponse(body, init = {}) {
  let responseBody = body;
  if (body === null || body === undefined) {
    responseBody = undefined;
  } else if (typeof body !== 'string' && !(body instanceof ArrayBuffer)) {
    responseBody = JSON.stringify(body);
  }

  return new Response(responseBody, {
    headers: JSON_HEADERS,
    ...init
  });
}

function parseConfigUrl(configUrl) {
  const url = new URL(configUrl);
  const params = url.searchParams;

  const sessionID = params.get('sessionID');
  const rgsUrl = params.get('rgs_url');
  if (!sessionID || !rgsUrl) {
    throw new Error('config_url_missing_params');
  }

  return {
    sessionID,
    rgsUrl,
    accessToken: params.get('access_token') || null,
    currency: params.get('currency') || 'USD',
    lang: params.get('lang') || params.get('language') || 'ru',
    device: params.get('device') || 'desktop',
    social: params.get('social') || 'false',
    demo: params.get('demo') || params.get('play_for_fun') || 'true',
    configUrl: url.toString()
  };
}

async function fetchStakeSession(slug, signal) {
  const body = JSON.stringify({
    query: 'mutation StartThirdPartyDemoSession($slug: String!) { startThirdPartyDemoSession(slug: $slug) { config } }',
    variables: { slug }
  });

  const upstreamResponse = await fetch(STAKE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; OfflineGameBot/1.0; +https://drop-tau.vercel.app)',
      'x-language': 'ru',
      'x-operation-name': 'StartThirdPartyDemoSession',
      'x-operation-type': 'mutation'
    },
    body,
    redirect: 'follow',
    signal
  });

  const rawText = await upstreamResponse.text();
  logDebug('Upstream status', upstreamResponse.status, upstreamResponse.statusText);
  logDebug('Upstream payload (trimmed)', rawText.slice(0, 500));

  if (!upstreamResponse.ok) {
    const error = new Error('upstream_http_error');
    error.status = upstreamResponse.status;
    error.body = rawText;
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(rawText);
  } catch (error) {
    const parseError = new Error('upstream_invalid_json');
    parseError.body = rawText;
    throw parseError;
  }

  if (payload.errors && payload.errors.length) {
    const gqlError = new Error('upstream_graphql_error');
    gqlError.errors = payload.errors;
    throw gqlError;
  }

  const configUrl = payload?.data?.startThirdPartyDemoSession?.config;
  if (!configUrl) {
    const missingError = new Error('config_url_not_found');
    missingError.payload = payload;
    throw missingError;
  }

  return parseConfigUrl(configUrl);
}

async function handleSessionRequest(request) {
  if (request.method === 'OPTIONS') {
    return toResponse(null, { status: 204 });
  }

  if (request.method !== 'POST' && request.method !== 'GET') {
    return toResponse({ error: 'method_not_allowed' }, { status: 405 });
  }

  const { slug: incomingSlug } = await readRequestPayload(request);
  const slug = normalizeSlug(incomingSlug);

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 15000);

  try {
    const session = await fetchStakeSession(slug, controller.signal);
    return toResponse({
      ok: true,
      slug,
      sessionID: session.sessionID,
      rgsUrl: session.rgsUrl,
      accessToken: session.accessToken,
      currency: session.currency,
      lang: session.lang,
      device: session.device,
      social: session.social,
      demo: session.demo,
      configUrl: session.configUrl
    });
  } catch (error) {
    logDebug('Session fetch failed', error);
    const status = error.status || 500;
    return toResponse({
      ok: false,
      error: error.message || 'session_fetch_failed',
      status: error.status || 500,
      details: error.errors || undefined,
      body: error.body || undefined,
      payload: error.payload || undefined
    }, { status });
  } finally {
    clearTimeout(abortTimer);
  }
}

export default {
  async fetch(request, env, ctx) {
    return handleSessionRequest(request);
  }
};

export async function onRequestOptions(request) {
  return toResponse(null, { status: 204 });
}

export async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const requestInit = {
    method: req.method,
    headers: req.headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await readNodeBody(req)
  };
  const request = new Request(url.toString(), requestInit);
  const response = await handleSessionRequest(request);
  if (typeof res.status === 'function') {
    res.status(response.status);
  } else {
    res.statusCode = response.status;
  }
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buffer = await response.arrayBuffer();
  const nodeBuffer = Buffer.from(buffer);
  if (typeof res.send === 'function') {
    res.send(nodeBuffer);
  } else {
    res.end(nodeBuffer);
  }
}

async function readNodeBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  return Buffer.concat(chunks);
}

