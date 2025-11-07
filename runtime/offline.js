/* 🔧 Enhanced Offline Runtime - auto-generated */

// ============================================
// 1. WebSocket Shim с улучшенной логикой
// ============================================
(function() {
  // Сохраняем ссылку на нативный fetch ДО любых переопределений (глобально)
  try {
    if (typeof window.fetch === 'function' && !window.__NATIVE_FETCH) {
      window.__NATIVE_FETCH = window.fetch.bind(window);
    }
  } catch (_) {}
  const NativeWS = window.WebSocket;
  if (!NativeWS) return;

  class FakeWS {
    constructor(url, protocols) {
      this.url = url;
      this.protocols = protocols;
      this.readyState = FakeWS.CONNECTING;
      this._listeners = {};
      console.log('[OFFLINE][WS] Creating fake WebSocket for:', url);
      
      queueMicrotask(() => {
        this.readyState = FakeWS.OPEN;
        console.log('[OFFLINE][WS] WebSocket opened');
        this._emit('open', new Event('open'));
        startReplay(this, url);
      });
    }
    send(data) {
      console.log('[OFFLINE][WS] client->send:', data);
    }
    close() {
      this.readyState = FakeWS.CLOSED;
      this._emit('close', new CloseEvent('close', { code: 1000, reason: 'offline' }));
    }
    addEventListener(t, cb){ (this._listeners[t] ||= new Set()).add(cb); }
    removeEventListener(t, cb){ this._listeners[t]?.delete(cb); }
    _emit(t, evt){
      const h = this['on' + t];
      if (typeof h === 'function') try { h.call(this, evt); } catch(e){ console.error('[OFFLINE][WS] on' + t + ' error:', e); }
      this._listeners[t]?.forEach(cb => { try { cb.call(this, evt); } catch(e){ console.error('[OFFLINE][WS] listener error:', e); } });
    }
  }
  FakeWS.CONNECTING = 0; FakeWS.OPEN = 1; FakeWS.CLOSING = 2; FakeWS.CLOSED = 3;

  function startReplay(ws, url){
    // Улучшенное определение BASE пути
    let BASE = '/';
    const match = location.pathname.match(/^(.*\/dist\/[^\/]+\/)/);
    if (match && match[1]) {
      BASE = match[1];
    } else {
      const parts = location.pathname.split('/');
      const mirrorIndex = parts.indexOf('mirror');
      if (mirrorIndex > 0) {
        BASE = parts.slice(0, mirrorIndex).join('/') + '/';
      }
    }
    console.log('[OFFLINE][WS] BASE path:', BASE);
    
    fetch(BASE + 'mocks/wsMap.json')
      .then(r => {
        console.log('[OFFLINE][WS] wsMap.json loaded');
        return r.json();
      })
      .then(list => {
        console.log('[OFFLINE][WS] wsMap list:', list);
        const mock = Array.isArray(list) ? list.find(x => url.includes(x.url) || x.url.includes('ws/')) : null;
        console.log('[OFFLINE][WS] Found mock:', mock);
        if (!mock || !mock.file) {
          console.warn('[OFFLINE][WS] No mock found for:', url);
          return;
        }
        
        console.log('[OFFLINE][WS] Loading NDJSON from:', BASE + mock.file);
        return fetch(BASE + mock.file).then(r => {
          console.log('[OFFLINE][WS] NDJSON file loaded');
          return r.text();
        }).then(txt => {
          const lines = txt.split('\n').filter(Boolean);
          console.log('[OFFLINE][WS] Replaying', lines.length, 'lines from', mock.file);
          
          let firstTimestamp = null;
          
          lines.forEach((line, index) => {
            try {
              const rec = JSON.parse(line);
              
              // Постепенная отправка с задержками
              if (firstTimestamp === null) {
                firstTimestamp = rec.ts || 0;
              }
              const delay = Math.max(0, (rec.ts - firstTimestamp) || index * 200);
              
              setTimeout(() => {
                const data = rec.data || rec.text || line;
                console.log('[OFFLINE][WS] Sending message', index + 1, 'of', lines.length);
                ws._emit('message', new MessageEvent('message', { 
                  data: typeof data === 'string' ? data : JSON.stringify(data) 
                }));
                
                // Убираем прелоадер после первого сообщения
                if (index === 0) {
                  const preloader = document.querySelector('.preloader, .loading, [class*="loading"], [class*="preload"]');
                  if (preloader) {
                    console.log('[OFFLINE][WS] Removing preloader');
                    preloader.style.display = 'none';
                  }
                }
              }, delay);
            } catch (e) {
              console.warn('[OFFLINE][WS] Failed to parse line:', line, e);
            }
          });
          
          // Пульс каждые 5 секунд
          setInterval(() => {
            ws._emit('message', new MessageEvent('message', { 
              data: '{"type":"ping","ts":' + Date.now() + '}' 
            }));
          }, 5000);
        });
      })
      .catch(e => console.error('[OFFLINE][WS] Replay error:', e));
  }

  // Proxy перехват
  window.WebSocket = new Proxy(NativeWS, { 
    construct(_t, args) { 
      const url = args[0];
      console.log('[OFFLINE][WS] WebSocket constructor called with:', url);
      if (typeof url === 'string' && /wss?:\/\//i.test(url) && /\/(ws|websocket|game)/i.test(url)) {
        console.log('[OFFLINE][WS] ✓ Intercepting:', url);
        return new FakeWS(...args);
      }
      console.log('[OFFLINE][WS] ✗ Not intercepting');
      return new NativeWS(...args);
    }
  });
  
  console.log('[OFFLINE] WebSocket shim initialized');
  
  // Тестовый WebSocket через 3 сек
  setTimeout(() => {
    console.log('[OFFLINE][WS] Testing availability...');
    try {
      const testWS = new window.WebSocket('wss://test-websocket.example.com/ws/test');
      console.log('[OFFLINE][WS] Test created:', testWS);
    } catch (e) {
      console.log('[OFFLINE][WS] Test error:', e);
    }
  }, 3000);
})();

// ============================================
// 2. XHR/Fetch Shim для API моков
// ============================================
(function() {
  // Улучшенное определение BASE пути
  let BASE = '/';
  const match = location.pathname.match(/^(.*\/dist\/[^\/]+\/)/);
  if (match && match[1]) {
    BASE = match[1];
  } else {
    const parts = location.pathname.split('/');
    const mirrorIndex = parts.indexOf('mirror');
    if (mirrorIndex > 0) {
      BASE = parts.slice(0, mirrorIndex).join('/') + '/';
    }
  }
  console.log('[OFFLINE] BASE path:', BASE);
  
  let apiMocks = null;
  
  // Проверка, включено ли проксирование к реальному API
  // Всегда ВКЛЮЧЕНО: отключение оффлайна и моков
  function __useRealApi() {
    return true;
  }
  
  // Получение URL реального API сервера
  function __getRealApiUrl() {
    // Сначала проверяем параметр rgs_url из URL (если есть)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const rgsUrl = urlParams.get('rgs_url');
      if (rgsUrl && typeof rgsUrl === 'string' && rgsUrl.trim()) {
        const cleanUrl = rgsUrl.trim();
        // Если не содержит протокол, добавляем https://
        const fullUrl = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') 
          ? cleanUrl 
          : 'https://' + cleanUrl;
        return fullUrl.replace(/\/+$/, ''); // Убираем trailing slashes
      }
    } catch (_) {}
    
    // Затем проверяем localStorage
    try {
      const url = localStorage.getItem('OFFLINE_REAL_API_URL');
      if (url && typeof url === 'string' && url.trim()) {
        return url.trim().replace(/\/+$/, ''); // Убираем trailing slashes
      }
    } catch (_) {}
    
    // Дефолтный URL
    return 'https://rgs.twist-rgs.com';
  }
  
  // Мгновенная инициализация баланса при загрузке рантайма (до любых запросов)
  try {
    const existing = Number(localStorage.getItem('OFFLINE_BALANCE'));
    let currencyFactor = 1000000;
    const cf = Number(localStorage.getItem('OFFLINE_CURRENCY_FACTOR'));
    if (isFinite(cf) && cf > 0) currencyFactor = cf;
    let start = 1000;
    const s = Number(localStorage.getItem('OFFLINE_START_BALANCE'));
    if (isFinite(s) && s > 0) start = s;
    if (!isFinite(existing) || existing <= 0) {
      const init = Math.round(start * currencyFactor);
      localStorage.setItem('OFFLINE_BALANCE', String(init));
      console.log('[OFFLINE] Bootstrap balance set to:', start, '$ =', init, 'units');
    }
  } catch (e) { console.warn('[OFFLINE] Bootstrap balance init skipped:', e); }
  
  // Автоматически сохраняем параметры из URL в localStorage при инициализации
  // Это позволяет не вводить их вручную в консоли
  try {
    const urlParams = new URLSearchParams(window.location.search);
    // Резерв: document.referrer и window.top.location.search
    let refParams = null;
    try { if (document.referrer) refParams = new URLSearchParams(new URL(document.referrer).search); } catch (_) {}
    let topParams = null;
    try { if (window.top && window.top !== window && window.top.location) topParams = new URLSearchParams(window.top.location.search); } catch (_) {}
    
    // Сохраняем rgs_url из URL/реферера/top в localStorage (если есть)
    let rgsUrl = urlParams.get('rgs_url') || (refParams && refParams.get('rgs_url')) || (topParams && topParams.get('rgs_url'));
    if (rgsUrl && typeof rgsUrl === 'string' && rgsUrl.trim()) {
      const cleanUrl = rgsUrl.trim();
      const fullUrl = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') 
        ? cleanUrl 
        : 'https://' + cleanUrl;
      const normalizedUrl = fullUrl.replace(/\/+$/, '');
      localStorage.setItem('OFFLINE_REAL_API_URL', normalizedUrl);
      console.log('[OFFLINE] 📍 Auto-saved rgs_url from URL to localStorage:', normalizedUrl);
    }
    
    // Сохраняем sessionID из URL/реферера/top в localStorage (если есть)
    let sessionID = urlParams.get('sessionID') || (refParams && refParams.get('sessionID')) || (topParams && topParams.get('sessionID'));
    if (sessionID && typeof sessionID === 'string' && sessionID.trim()) {
      localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', sessionID.trim());
      // Также сохраняем под ключом LAST_SESSION_ID для совместимости с index.html
      localStorage.setItem('LAST_SESSION_ID', sessionID.trim());
      console.log('[OFFLINE] 🔑 Auto-saved sessionID from URL to localStorage:', sessionID.trim());
    }
    
    // Также проверяем LAST_SESSION_ID из localStorage и синхронизируем с OFFLINE_REAL_API_SESSION_ID
    try {
      const lastSessionID = localStorage.getItem('LAST_SESSION_ID');
      if (lastSessionID && lastSessionID.trim() && !sessionID) {
        // Если sessionID есть в LAST_SESSION_ID, но нет в URL, используем его
        localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', lastSessionID.trim());
        console.log('[OFFLINE] 🔑 Synced LAST_SESSION_ID to OFFLINE_REAL_API_SESSION_ID:', lastSessionID.trim());
      }
    } catch (e) {}
    
    // Сохраняем currency (если только в referrer/top)
    let currency = urlParams.get('currency') || (refParams && refParams.get('currency')) || (topParams && topParams.get('currency'));
    if (currency && currency.trim()) {
      try { localStorage.setItem('OFFLINE_REAL_API_CURRENCY', currency.trim()); } catch (_) {}
    }
    
  // Включаем реальный API по умолчанию, если флаг не установлен явно
  const useRealApiFlag = localStorage.getItem('OFFLINE_USE_REAL_API');
  if (useRealApiFlag === null) {
    // Если флаг не установлен, включаем по умолчанию
    localStorage.setItem('OFFLINE_USE_REAL_API', '1');
    console.log('[OFFLINE] ✅ Auto-enabled real API mode (default)');
  }
} catch (e) {
  console.warn('[OFFLINE] Failed to auto-save URL parameters:', e);
}

// Обработчик postMessage для получения sessionID от родительского окна
try {
  window.addEventListener('message', function(event) {
    // Проверяем, что сообщение содержит sessionID
    if (event.data && typeof event.data === 'object' && event.data.type === 'SET_SESSION_ID') {
      const { sessionID, rgsUrl, accessToken, force } = event.data;
      
      if (sessionID && typeof sessionID === 'string' && sessionID.trim()) {
        const trimmedSessionID = sessionID.trim();
        
        // Сохраняем sessionID в оба ключа для совместимости
        try {
          localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', trimmedSessionID);
          localStorage.setItem('LAST_SESSION_ID', trimmedSessionID);
          console.log('[OFFLINE] 🎧 Received sessionID via postMessage:', trimmedSessionID.substring(0, 20) + '...');
          
          // Если rgsUrl тоже передан, сохраняем его
          if (rgsUrl && typeof rgsUrl === 'string' && rgsUrl.trim()) {
            const trimmedRgsUrl = rgsUrl.trim();
            const normalizedRgs = trimmedRgsUrl.startsWith('http') ? trimmedRgsUrl : `https://${trimmedRgsUrl}`;
            localStorage.setItem('OFFLINE_REAL_API_URL', normalizedRgs.replace(/\/+$/, ''));
            localStorage.setItem('LAST_RGS_URL', trimmedRgsUrl);
            console.log('[OFFLINE] 🎧 Received rgsUrl via postMessage:', trimmedRgsUrl);
          }
          
          // Если accessToken передан, обновляем его в URL и localStorage
          if (accessToken && typeof accessToken === 'string' && accessToken.trim()) {
            try {
              const urlParams = new URLSearchParams(window.location.search);
              urlParams.set('access_token', accessToken.trim());
              
              // Добавляем sessionID и rgsUrl в URL, если их там нет
              if (!urlParams.has('sessionID')) {
                urlParams.set('sessionID', trimmedSessionID);
              }
              if (rgsUrl && !urlParams.has('rgs_url')) {
                urlParams.set('rgs_url', rgsUrl.trim());
              }
              
              const newUrl = window.location.pathname + '?' + urlParams.toString();
              window.history.replaceState({}, '', newUrl);
              console.log('[OFFLINE] 🎧 Updated URL with sessionID and access_token from postMessage');
            } catch (e) {
              console.warn('[OFFLINE] Failed to update URL with postMessage data:', e);
            }
          } else if (force || !window.location.search.includes('sessionID')) {
            // Если force=true или sessionID нет в URL, добавляем его в URL
            try {
              const urlParams = new URLSearchParams(window.location.search);
              urlParams.set('sessionID', trimmedSessionID);
              if (rgsUrl) {
                urlParams.set('rgs_url', rgsUrl.trim());
              }
              const newUrl = window.location.pathname + '?' + urlParams.toString();
              window.history.replaceState({}, '', newUrl);
              console.log('[OFFLINE] 🎧 Added sessionID to URL from postMessage');
            } catch (e) {
              console.warn('[OFFLINE] Failed to add sessionID to URL:', e);
            }
          }
        } catch (e) {
          console.error('[OFFLINE] Failed to save sessionID from postMessage:', e);
        }
      }
    }
  });
  console.log('[OFFLINE] 🎧 PostMessage listener установлен для получения sessionID от родительского окна');
} catch (e) {
  console.warn('[OFFLINE] Failed to setup postMessage listener:', e);
}

  // Если в localStorage уже есть sessionID/rgs_url, а в URL их нет — добавим их в адресную строку
  try {
    const urlParams2 = new URLSearchParams(window.location.search);
    // Проверяем оба ключа: OFFLINE_REAL_API_SESSION_ID и LAST_SESSION_ID
    let lsSession = localStorage.getItem('OFFLINE_REAL_API_SESSION_ID');
    if (!lsSession) {
      lsSession = localStorage.getItem('LAST_SESSION_ID');
      if (lsSession) {
        // Синхронизируем: сохраняем LAST_SESSION_ID в OFFLINE_REAL_API_SESSION_ID
        localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', lsSession);
      }
    }
    const lsBase = localStorage.getItem('OFFLINE_REAL_API_URL');
    const lsRgsUrl = localStorage.getItem('LAST_RGS_URL');
    const hasSessionInUrl = !!urlParams2.get('sessionID');
    const hasRgsInUrl = !!urlParams2.get('rgs_url');
    if (lsSession && !hasSessionInUrl) {
      urlParams2.set('sessionID', lsSession);
    }
    if (lsBase && !hasRgsInUrl) {
      try {
        const host = new URL(lsBase).host;
        urlParams2.set('rgs_url', host);
      } catch (_) {
        // Если lsBase не URL, пробуем использовать как есть
        if (!hasRgsInUrl) {
          urlParams2.set('rgs_url', lsBase);
        }
      }
    }
    // Также проверяем LAST_RGS_URL
    if (!hasRgsInUrl && lsRgsUrl) {
      urlParams2.set('rgs_url', lsRgsUrl);
    }
    const newUrl2 = window.location.pathname + '?' + urlParams2.toString();
    if (newUrl2 !== window.location.pathname + window.location.search) {
      try { history.replaceState(null, '', newUrl2); } catch (_) {}
    }
  } catch (_) {}
  
  // Проверка и логирование режима реального API
  const realApiEnabled = __useRealApi();
  const realApiUrl = __getRealApiUrl();
  
  if (realApiEnabled) {
    console.log('[OFFLINE] ✅ Real API mode ENABLED. API URL:', realApiUrl);
    console.log('[OFFLINE] 💡 To disable real API and use mocks, run: localStorage.setItem("OFFLINE_USE_REAL_API", "0")');
    
    // Проверяем, настроен ли API для обновления sessionID
    const sessionRefreshApiUrl = localStorage.getItem('OFFLINE_SESSION_REFRESH_API_URL');
    if (sessionRefreshApiUrl) {
      console.log('[OFFLINE] 🔄 Session refresh API configured:', sessionRefreshApiUrl);
      console.log('[OFFLINE] 💡 Fresh sessionID will be fetched automatically on page reload');
    } else {
      console.log('[OFFLINE] 💡 To enable automatic session refresh, set: localStorage.setItem("OFFLINE_SESSION_REFRESH_API_URL", "https://your-api-url/api/session-refresh")');
      console.log('[OFFLINE] 📖 See api/README.md for deployment instructions');
    }
  } else {
    console.log('[OFFLINE] ⚠️ Real API mode DISABLED. Using local mocks.');
    console.log('[OFFLINE] 💡 To enable real API, run: localStorage.setItem("OFFLINE_USE_REAL_API", "1")');
  }

  // Всегда создаём НОВУЮ сессию при загрузке страницы, если real API включен
  // 1) Берём access_token из URL (если есть) или из localStorage (если сохранён)
  // 2) Пытаемся /session/start с фейловером хоста: [текущий, rgs.stake-engine.com, rgs.twist-rgs.com]
  // 3) Сохраняем sessionID и рабочий хост в localStorage, обновляем URL (replaceState)
  // 4) Сохраняем access_token в localStorage для будущих обновлений страницы
  (async () => {
    if (!realApiEnabled) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      // Флаг: принудительно создавать НОВУЮ сессию при каждой загрузке страницы
      // По умолчанию ВКЛЮЧЕНО. Чтобы выключить: localStorage.setItem('OFFLINE_FORCE_NEW_SESSION_ON_LOAD','0')
      let forceNewSession = true;
      try {
        const v = localStorage.getItem('OFFLINE_FORCE_NEW_SESSION_ON_LOAD');
        if (v !== null) forceNewSession = v !== '0'; else localStorage.setItem('OFFLINE_FORCE_NEW_SESSION_ON_LOAD', '1');
      } catch (_) {}
      // Если НЕ принудительный режим и sessionID уже есть в URL/реферере/top — пропускаем создание новой сессии
      let sessionIdFromUrl = urlParams.get('sessionID');
      try {
        if ((!sessionIdFromUrl || !sessionIdFromUrl.trim()) && document.referrer) {
          sessionIdFromUrl = new URL(document.referrer).searchParams.get('sessionID');
        }
      } catch (_) {}
      try {
        if ((!sessionIdFromUrl || !sessionIdFromUrl.trim()) && window.top && window.top !== window) {
          sessionIdFromUrl = new URLSearchParams(window.top.location.search).get('sessionID');
        }
      } catch (_) {}
      if (!forceNewSession && sessionIdFromUrl && String(sessionIdFromUrl).trim()) {
        const trimmedSid = String(sessionIdFromUrl).trim();
        try { localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', trimmedSid); } catch (_) {}
        let rgsUrlFromUrl = urlParams.get('rgs_url');
        try {
          if ((!rgsUrlFromUrl || !rgsUrlFromUrl.trim()) && document.referrer) {
            rgsUrlFromUrl = new URL(document.referrer).searchParams.get('rgs_url');
          }
        } catch (_) {}
        try {
          if ((!rgsUrlFromUrl || !rgsUrlFromUrl.trim()) && window.top && window.top !== window) {
            rgsUrlFromUrl = new URLSearchParams(window.top.location.search).get('rgs_url');
          }
        } catch (_) {}
        if (rgsUrlFromUrl) {
          const normalizedBase = rgsUrlFromUrl.startsWith('http') ? rgsUrlFromUrl : `https://${rgsUrlFromUrl}`;
          try { localStorage.setItem('OFFLINE_REAL_API_URL', normalizedBase.replace(/\/$/, '')); } catch (_) {}
          console.log('[OFFLINE] 📍 Updated rgs_url from URL:', normalizedBase.replace(/\/$/, ''));
        }
        // Нормализуем URL (сохраним sessionID, rgs_url и currency)
        const newParams = new URLSearchParams(window.location.search);
        newParams.set('sessionID', trimmedSid);
        if (rgsUrlFromUrl) newParams.set('rgs_url', rgsUrlFromUrl);
        const currency = urlParams.get('currency')
          || (document.referrer ? new URL(document.referrer).searchParams.get('currency') : null)
          || (window.top && window.top !== window ? new URLSearchParams(window.top.location.search).get('currency') : null)
          || localStorage.getItem('OFFLINE_REAL_API_CURRENCY')
          || 'USD';
        newParams.set('currency', currency);
        const newUrl = window.location.pathname + '?' + newParams.toString();
        try { history.replaceState(null, '', newUrl); } catch (_) {}
        console.log('[OFFLINE] ▶ Using provided sessionID from URL:', trimmedSid, '- Skipping /session/start');
        return;
      }

      // Если НЕ принудительный режим и sessionID уже сохранён в localStorage — пропускаем /session/start
      try {
        const savedSid = localStorage.getItem('OFFLINE_REAL_API_SESSION_ID');
        if (!forceNewSession && savedSid && savedSid.trim()) {
          console.log('[OFFLINE] ▶ Using saved sessionID from localStorage:', savedSid.trim(), '- Skipping /session/start');
          return;
        }
      } catch (_) {}

      // Получаем access_token из localStorage (приоритет) или из URL
      // ВАЖНО: Токен пользователя НЕ должен перезаписываться из URL - он постоянный для устройства
      let accessToken = null;
      
      // ПРИОРИТЕТ 1: Используем токен из localStorage (постоянный токен пользователя)
      try {
        accessToken = localStorage.getItem('OFFLINE_USER_ACCESS_TOKEN');
        if (accessToken) {
          console.log('[OFFLINE] 🔑 Using permanent user access_token from localStorage');
          // Обновляем URL с постоянным токеном пользователя, если он отличается
          const urlToken = urlParams.get('access_token');
          if (urlToken && urlToken !== accessToken) {
            urlParams.set('access_token', accessToken);
            history.replaceState(null, '', location.pathname + '?' + urlParams.toString());
            console.log('[OFFLINE] 🔄 Updated URL with permanent user access_token');
          }
        }
      } catch (_) {}
      
      // ПРИОРИТЕТ 2: Если токена пользователя нет, используем из URL (только при первом запуске)
      if (!accessToken) {
        accessToken = urlParams.get('access_token');
        if (accessToken) {
          // Сохраняем токен из URL только если у пользователя еще нет постоянного токена
          try {
            localStorage.setItem('OFFLINE_USER_ACCESS_TOKEN', accessToken);
            localStorage.setItem('OFFLINE_REAL_API_ACCESS_TOKEN', accessToken); // Для совместимости
            console.log('[OFFLINE] 💾 Saved access_token from URL to localStorage (first time only)');
          } catch (_) {}
        } else {
          // ПРИОРИТЕТ 3: Fallback на старый ключ для совместимости
          try {
            accessToken = localStorage.getItem('OFFLINE_REAL_API_ACCESS_TOKEN');
            if (accessToken) {
              // Мигрируем на новый ключ
              localStorage.setItem('OFFLINE_USER_ACCESS_TOKEN', accessToken);
              console.log('[OFFLINE] 🔄 Migrated access_token to permanent storage');
            }
          } catch (_) {}
        }
      }
      
      // ПРИОРИТЕТ 1: Попытка получить свежий sessionID через наш API (если настроен)
      // Это работает только если у вас развернут serverless-функция для парсинга stake.com
      const sessionRefreshApiUrl = localStorage.getItem('OFFLINE_SESSION_REFRESH_API_URL');
      if (sessionRefreshApiUrl && forceNewSession) {
        try {
          console.log('[OFFLINE] 🔄 Attempting to fetch fresh sessionID from API:', sessionRefreshApiUrl);
          // gameUrl можно задать через localStorage или URL параметр
          const gameUrl = urlParams.get('gameUrl') 
            || localStorage.getItem('OFFLINE_SESSION_REFRESH_GAME_URL')
            || 'https://stake.com/ru/casino/games/mirrorimage-drop-the-boss-trump';
          const apiUrl = `${sessionRefreshApiUrl}${sessionRefreshApiUrl.includes('?') ? '&' : '?'}gameUrl=${encodeURIComponent(gameUrl)}`;
          
          const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            },
            mode: 'cors'
          });
          
          if (apiResponse.ok) {
            const apiData = await apiResponse.json().catch(() => null);
            if (apiData && apiData.sessionID && apiData.rgs_url) {
              console.log('[OFFLINE] ✅ Successfully fetched fresh sessionID from API:', apiData.sessionID.substring(0, 20) + '...');
              
              // Сохраняем полученные данные
              try {
                localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', String(apiData.sessionID));
                const normalizedRgs = apiData.rgs_url.startsWith('http') ? apiData.rgs_url : `https://${apiData.rgs_url}`;
                localStorage.setItem('OFFLINE_REAL_API_URL', normalizedRgs.replace(/\/$/, ''));
                if (apiData.currency) {
                  localStorage.setItem('OFFLINE_REAL_API_CURRENCY', apiData.currency);
                }
              } catch (_) {}
              
              // Обновляем URL
              const newParams = new URLSearchParams(window.location.search);
              newParams.set('sessionID', String(apiData.sessionID));
              newParams.set('rgs_url', apiData.rgs_url);
              if (apiData.currency) newParams.set('currency', apiData.currency);
              const newUrl = window.location.pathname + '?' + newParams.toString();
              try { history.replaceState(null, '', newUrl); } catch (_) {}
              
              console.log('[OFFLINE] ✅ Session refreshed via API. New sessionID:', apiData.sessionID.substring(0, 20) + '...');
              return; // Успешно получили sessionID, выходим
            } else {
              console.warn('[OFFLINE] ⚠️ API returned invalid data:', apiData);
            }
          } else {
            const errorText = await apiResponse.text().catch(() => '');
            console.warn('[OFFLINE] ⚠️ API request failed:', apiResponse.status, errorText.substring(0, 100));
          }
        } catch (apiError) {
          console.warn('[OFFLINE] ⚠️ Failed to fetch sessionID from API:', apiError);
          // Продолжаем с обычным методом (/session/start)
        }
      }
      
      // Если токена нет ни в URL, ни в localStorage - не можем создать сессию
      if (!accessToken) {
        console.warn('[OFFLINE] ⚠️ No access_token found in URL or localStorage. Cannot create new session.');
        
        // Без сервера: предлагаем способ получить sessionID через bookmarklet на странице Stake
        try {
          const bookmarklet =
            "javascript:(()=>{try{const ifr=[...document.querySelectorAll('iframe')].find(f=>/drop-the-boss\\/v\\d+/.test(String(f.src)));if(!ifr){alert('Не найден iframe с игрой. Откройте страницу игры и повторите.');return;}const u=new URL(ifr.src);const sid=u.searchParams.get('sessionID');const rgs=u.searchParams.get('rgs_url');const cur=u.searchParams.get('currency')||'USD';if(!sid||!rgs){alert('Не удалось извлечь sessionID/rgs_url.');return;}const dest=location.origin+'/?sessionID='+encodeURIComponent(sid)+'&rgs_url='+encodeURIComponent(rgs)+'&currency='+encodeURIComponent(cur);window.open(dest,'_self');}catch(e){alert('Ошибка bookmarklet: '+e.message);}})();";
          console.log('\n[OFFLINE] 🔗 Bookmarklet для получения sessionID без сервера:\n' + bookmarklet + '\n');
          console.log('[OFFLINE] Инструкция:');
          console.log('1) Создайте закладку в браузере.');
          console.log('2) В качестве URL закладки вставьте код из строки выше (начинается с "javascript:(()=>{")');
          console.log('3) Откройте страницу игры на stake.com с нужной игрой.');
          console.log('4) Нажмите эту закладку — вы будете перенаправлены на нашу страницу уже с sessionID и rgs_url.');
        } catch (_) {}
        
        // Альтернатива без закладки: попросим у пользователя вставить URL из iframe (src)
        try {
          const pasted = window.prompt('Вставьте сюда URL iframe (src) со страницы Stake (содержит sessionID и rgs_url):');
          if (pasted && pasted.trim()) {
            try {
              let src = pasted.trim();
              if (src.startsWith('//')) src = 'https:' + src;
              if (!/^https?:\/\//i.test(src)) src = 'https://' + src;
              const u = new URL(src);
              const sid = u.searchParams.get('sessionID');
              const rgs = u.searchParams.get('rgs_url');
              const cur = u.searchParams.get('currency') || 'USD';
              if (sid && rgs) {
                try {
                  localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', sid);
                  const normalizedRgs = rgs.startsWith('http') ? rgs : `https://${rgs}`;
                  localStorage.setItem('OFFLINE_REAL_API_URL', normalizedRgs.replace(/\/$/, ''));
                  localStorage.setItem('OFFLINE_REAL_API_CURRENCY', cur);
                } catch (_) {}
                const newParams = new URLSearchParams(window.location.search);
                newParams.set('sessionID', sid);
                newParams.set('rgs_url', rgs);
                newParams.set('currency', cur);
                const newUrl = window.location.pathname + '?' + newParams.toString();
                try { history.replaceState(null, '', newUrl); } catch (_) {}
                console.log('[OFFLINE] ✅ Session parameters applied from pasted URL');
                return;
              } else {
                console.warn('[OFFLINE] Некорректный URL: не найдены sessionID/rgs_url');
              }
            } catch (e) {
              console.warn('[OFFLINE] Невалидный URL:', e);
            }
          }
        } catch (_) {}
        return;
      }
      
      const currency = urlParams.get('currency') || localStorage.getItem('OFFLINE_REAL_API_CURRENCY') || 'USD';
      const gameIDParam = urlParams.get('gameID') || '0196ecd0-c06c-74ca-9bc9-e6b3310f1651';
      
      // Сохраняем currency в localStorage
      try {
        localStorage.setItem('OFFLINE_REAL_API_CURRENCY', currency);
      } catch (_) {}

      // ПРИОРИТЕТ 2: Стартуем новую сессию через /session/start (fallback, если API не настроен или не сработал)
      // Список хостов для попыток (уникальные)
      const candidates = [];
      const current = realApiUrl.replace(/\/$/, '');
      if (current) candidates.push(current);
      if (!candidates.includes('https://rgs.stake-engine.com')) candidates.push('https://rgs.stake-engine.com');
      if (!candidates.includes('https://rgs.twist-rgs.com')) candidates.push('https://rgs.twist-rgs.com');

      let chosenBase = null;
      let newSessionID = null;

      console.log('[OFFLINE] 🔄 Creating new session via /session/start (with failover)...');
      for (const base of candidates) {
        try {
          const url = base + '/session/start';
          // Используем нативный fetch, чтобы избежать гонки с нашим переопределением
          const nativeFetchFn = (typeof window.__NATIVE_FETCH === 'function') ? window.__NATIVE_FETCH : window.fetch;
          
          // Вариант без preflight: простые заголовки и text/plain
          const headers1 = new Headers({ 
            'Content-Type': 'text/plain'
          });
          const body1 = JSON.stringify({ gameID: gameIDParam, currency });
          
          console.log('[OFFLINE] 🔍 Trying /session/start on', base);
          console.log('[OFFLINE] 🔍 Request body:', body1);
          console.log('[OFFLINE] 🔍 Access token present:', !!accessToken);
          const res = nativeFetchFn ? await nativeFetchFn(url, {
            method: 'POST',
            headers: headers1,
            body: body1,
            mode: 'cors'
          }) : null;
          
          if (!res || !res.ok) {
            const t = res ? (await res.text().catch(() => '')) : 'no-response';
            console.warn('[OFFLINE] /session/start failed on', base, '-', res ? res.status : 'no-status', t);
            
            // Пробуем второй вариант: access_token в body (всё ещё без нестандартных заголовков)
            if (accessToken) {
              console.log('[OFFLINE] 🔍 Retrying /session/start on', base, 'with access_token in body');
              const headers2 = new Headers({ 'Content-Type': 'text/plain' });
              const body2 = JSON.stringify({ gameID: gameIDParam, access_token: accessToken, currency });
              const res2 = nativeFetchFn ? await nativeFetchFn(url, {
                method: 'POST',
                headers: headers2,
                body: body2,
                mode: 'cors'
              }) : null;
              
              if (res2 && res2.ok) {
                const data2 = await res2.json().catch(() => ({}));
                const sid2 = data2.sessionID || (data2.config && data2.config.sessionID);
                if (sid2) {
                  chosenBase = base;
                  newSessionID = String(sid2);
                  break;
                }
              }
            }
            continue;
          }
          let data = {};
          try { data = await res.json(); } catch (e) {
            console.warn('[OFFLINE] Failed to parse /session/start on', base, e);
            continue;
          }
          const sid = data.sessionID || (data.config && data.config.sessionID);
          if (!sid) {
            console.warn('[OFFLINE] No sessionID in response on', base, data);
            continue;
          }
          chosenBase = base;
          newSessionID = String(sid);
          break;
        } catch (e) {
          console.warn('[OFFLINE] /session/start error on', base, e);
        }
      }

      if (!chosenBase || !newSessionID) {
        console.warn('[OFFLINE] ❌ Could not create session on any known host');
        return;
      }

      console.log('[OFFLINE] ✅ New session created on', chosenBase, 'sessionID:', newSessionID);

      // Сохраняем sessionID в localStorage
      try { 
        localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', String(newSessionID)); 
      } catch (_) {}

      // Сохраняем выбранный рабочий базовый URL
      try {
        localStorage.setItem('OFFLINE_REAL_API_URL', chosenBase);
      } catch (_) {}

      // Формируем новый URL: добавляем sessionID и rgs_url, убираем access_token
      const newParams = new URLSearchParams(window.location.search);
      newParams.set('sessionID', String(newSessionID));
      try {
        const host = new URL(chosenBase).host;
        newParams.set('rgs_url', host);
      } catch (_) {
        // если не распарсили — оставим как есть
      }
      newParams.set('currency', currency);
      newParams.delete('access_token'); // Убираем access_token из URL (он сохранён в localStorage)

      const newUrl = window.location.pathname + '?' + newParams.toString();
      try { 
        history.replaceState(null, '', newUrl); 
        console.log('[OFFLINE] 🔁 URL updated with new sessionID:', newSessionID);
      } catch (_) {}
    } catch (e) {
      console.warn('[OFFLINE] ❌ Auto new-session flow failed:', e);
    }
  })();
  
  fetch(BASE + 'mocks/apiMap.json')
    .then(r => r.json())
    .then(mocks => {
      apiMocks = Array.isArray(mocks) ? mocks : [];
      if (!realApiEnabled) {
        console.log('[OFFLINE] Loaded', apiMocks.length, 'API mocks from:', BASE);
      }
    })
    .catch(e => {
      if (!realApiEnabled) {
        console.warn('[OFFLINE] Failed to load API mocks from', BASE + ':', e);
      }
    });
  
  // Перехват fetch для API моков
  const originalFetch = window.fetch;
  // === RTP/Volatility helpers ===
  function __rtp_getTarget() {
    let target = 0.96;
    try {
      const v = Number(localStorage.getItem('OFFLINE_TARGET_RTP'));
      if (isFinite(v) && v > 0 && v < 5) target = v;
    } catch (_) {}
    return target;
  }
  function __rtp_getTier() {
    let tier = 1; // 1 = низкая волатильность (частые мелкие выигрыши)
    try {
      const v = Number(localStorage.getItem('OFFLINE_VOLATILITY_TIER'));
      if (isFinite(v) && v >= 1 && v <= 5) tier = Math.round(v);
    } catch (_) {}
    return tier;
  }
  function __rtp_enabled() {
    try {
      const flag = String(localStorage.getItem('OFFLINE_USE_RTP_DIST') || '1').trim();
      return flag === '1' || flag.toLowerCase() === 'true';
    } catch (_) { return true; }
  }
  function __rtp_pickOutcome(outcomes) {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < outcomes.length; i++) {
      acc += outcomes[i].p;
      if (r <= acc) return outcomes[i];
    }
    return outcomes[outcomes.length - 1];
  }
  function __rtp_calibrate(outcomes, targetMean) {
    // Нормируем суммы вероятностей
    let sumP = outcomes.reduce((s, o) => s + o.p, 0);
    if (sumP <= 0) return outcomes;
    outcomes = outcomes.map(o => ({ mult: o.mult, p: o.p / sumP }));
    // Текущий RTP
    const cur = outcomes.reduce((s, o) => s + o.p * o.mult, 0);
    let diff = targetMean - cur;
    if (Math.abs(diff) < 1e-6) return outcomes;
    // Корректируем последнюю положительную категорию за счёт нулевой
    const zeroIdx = outcomes.findIndex(o => o.mult === 0);
    let posIdx = -1;
    for (let i = outcomes.length - 1; i >= 0; i--) {
      if (outcomes[i].mult > 0) { posIdx = i; break; }
    }
    if (posIdx >= 0) {
      const m = outcomes[posIdx].mult;
      const deltaP = diff / (m || 1);
      const newPos = Math.max(0, outcomes[posIdx].p + deltaP);
      const d = newPos - outcomes[posIdx].p;
      outcomes[posIdx] = { mult: outcomes[posIdx].mult, p: newPos };
      if (zeroIdx >= 0) {
        outcomes[zeroIdx] = { mult: 0, p: Math.max(0, outcomes[zeroIdx].p - d) };
      }
      // Финальная нормировка
      sumP = outcomes.reduce((s, o) => s + o.p, 0);
      outcomes = outcomes.map(o => ({ mult: o.mult, p: o.p / (sumP || 1) }));
    }
    return outcomes;
  }
  function __rtp_outcomes_for_tier(tier) {
    // Наборы для 1..5 (1 = низкая волатильность)
    const presets = {
      1: [ // частые мелкие выигрыши
        { mult: 0,   p: 0.06 },
        { mult: 0.5, p: 0.18 },
        { mult: 0.8, p: 0.22 },
        { mult: 1.0, p: 0.29 },
        { mult: 1.5, p: 0.15 },
        { mult: 2.0, p: 0.10 }
      ],
      2: [
        { mult: 0,   p: 0.20 },
        { mult: 0.5, p: 0.22 },
        { mult: 1.0, p: 0.25 },
        { mult: 1.5, p: 0.18 },
        { mult: 2.0, p: 0.10 },
        { mult: 3.0, p: 0.05 }
      ],
      3: [
        { mult: 0,   p: 0.40 },
        { mult: 0.5, p: 0.20 },
        { mult: 1.0, p: 0.18 },
        { mult: 2.0, p: 0.12 },
        { mult: 5.0, p: 0.07 },
        { mult: 10,  p: 0.03 }
      ],
      4: [
        { mult: 0,   p: 0.62 },
        { mult: 0.5, p: 0.18 },
        { mult: 1.0, p: 0.10 },
        { mult: 2.0, p: 0.07 },
        { mult: 10,  p: 0.02 },
        { mult: 20,  p: 0.01 }
      ],
      5: [ // экстремально высокая
        { mult: 0,   p: 0.80 },
        { mult: 1.0, p: 0.12 },
        { mult: 3.0, p: 0.06 },
        { mult: 25,  p: 0.019 },
        { mult: 100, p: 0.001 }
      ]
    };
    return presets[tier] || presets[1];
  }
  // Хелпер: попытка считать ставку из UI (текст вида "Bet $X.XX")
  function __offlineGetUiBet() {
    try {
      const moneyToNumber = (s) => {
        if (!s) return NaN;
        const cleaned = String(s).replace(/[^0-9.,]/g, '').replace(/,(?=\d{3}(\D|$))/g, '');
        const normalized = cleaned.replace(',', '.');
        const num = Number(normalized);
        return isFinite(num) ? num : NaN;
      };
      const candidates = [];
      candidates.push(...document.querySelectorAll('[aria-label*="bet" i], [class*="bet" i]'));
      if (candidates.length === 0 && document.body) {
        const all = document.body.querySelectorAll('*');
        let count = 0;
        for (const el of all) {
          if (++count > 2000) break;
          const t = (el.textContent || '').trim();
          if (!t) continue;
          if (/\bbet\b/i.test(t)) candidates.push(el);
        }
      }
      for (const el of candidates) {
        const text = (el.textContent || '').trim();
        const m = text.match(/bet\s*\$?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i);
        if (m && m[1]) {
          const v = moneyToNumber(m[1]);
          if (isFinite(v)) return v;
        }
        const maybeInputs = el.querySelectorAll('input, [data-value], [value]');
        for (const inp of maybeInputs) {
          const v = moneyToNumber(inp.getAttribute('data-value') || inp.getAttribute('value') || inp.textContent);
          if (isFinite(v)) return v;
        }
      }
    } catch (_) {}
    return NaN;
  }
  
  // Хелпер: попытка получить цену бонуса (ante или chaos) из UI
  function __offlineGetBonusPrice(bonusMode) {
    try {
      const moneyToNumber = (s) => {
        if (!s) return NaN;
        const cleaned = String(s).replace(/[^0-9.,]/g, '').replace(/,(?=\d{3}(\D|$))/g, '');
        const normalized = cleaned.replace(',', '.');
        const num = Number(normalized);
        return isFinite(num) ? num : NaN;
      };
      
      // Ищем кнопки и элементы, связанные с бонусами
      const bonusKeywords = bonusMode === 'ante' ? ['ante', 'ant'] : ['chaos'];
      const candidates = [];
      
      // Поиск по aria-label, классам, id
      for (const keyword of bonusKeywords) {
        candidates.push(...document.querySelectorAll(
          `[aria-label*="${keyword}" i], [class*="${keyword}" i], [id*="${keyword}" i], [data-mode*="${keyword}" i]`
        ));
      }
      
      // Если не нашли, ищем по тексту в DOM
      if (candidates.length === 0 && document.body) {
        const all = document.body.querySelectorAll('*');
        let count = 0;
        for (const el of all) {
          if (++count > 3000) break; // Увеличиваем лимит для поиска бонусов
          const t = (el.textContent || '').trim().toLowerCase();
          if (!t) continue;
          // Проверяем наличие ключевых слов бонуса
          for (const keyword of bonusKeywords) {
            if (t.includes(keyword)) {
              candidates.push(el);
              break;
            }
          }
        }
      }
      
      // Ищем цену в найденных элементах
      for (const el of candidates) {
        // Ищем цену в тексте элемента (форматы: $5, 5$, $5.00, 5 USD и т.д.)
        const text = (el.textContent || '').trim();
        
        // Паттерны для поиска цены: $X, X$, X USD, и т.д.
        const pricePatterns = [
          /\$?\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:USD|\$|€|£)?/i,
          /([0-9]+(?:[.,][0-9]{1,2})?)\s*\$?/,
          /cost[:\s]*\$?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i,
          /price[:\s]*\$?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i,
          /([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:USD|EUR|GBP)/i
        ];
        
        for (const pattern of pricePatterns) {
          const m = text.match(pattern);
          if (m && m[1]) {
            const v = moneyToNumber(m[1]);
            if (isFinite(v) && v > 0) {
              console.log(`[OFFLINE] Found ${bonusMode} bonus price from UI:`, v);
              return v;
            }
          }
        }
        
        // Проверяем data-атрибуты
        const dataAttrs = ['data-price', 'data-cost', 'data-value', 'data-bet', 'data-amount'];
        for (const attr of dataAttrs) {
          const val = el.getAttribute(attr);
          if (val) {
            const v = moneyToNumber(val);
            if (isFinite(v) && v > 0) {
              console.log(`[OFFLINE] Found ${bonusMode} bonus price from ${attr}:`, v);
              return v;
            }
          }
        }
        
        // Проверяем вложенные элементы с ценами
        const priceElements = el.querySelectorAll('[class*="price" i], [class*="cost" i], [class*="bet" i], [class*="amount" i]');
        for (const priceEl of priceElements) {
          const priceText = (priceEl.textContent || '').trim();
          for (const pattern of pricePatterns) {
            const m = priceText.match(pattern);
            if (m && m[1]) {
              const v = moneyToNumber(m[1]);
              if (isFinite(v) && v > 0) {
                console.log(`[OFFLINE] Found ${bonusMode} bonus price from nested element:`, v);
                return v;
              }
            }
          }
        }
      }
      
      // Пытаемся найти через игровой объект (если доступен)
      try {
        if (window.ingenuity && window.ingenuity.baseGameModel) {
          const gameModel = window.ingenuity.baseGameModel;
          // Проверяем возможные поля с ценами бонусов
          if (gameModel.antePrice && bonusMode === 'ante') {
            const v = moneyToNumber(String(gameModel.antePrice));
            if (isFinite(v) && v > 0) {
              console.log(`[OFFLINE] Found ante price from gameModel:`, v);
              return v;
            }
          }
          if (gameModel.chaosPrice && bonusMode === 'chaos') {
            const v = moneyToNumber(String(gameModel.chaosPrice));
            if (isFinite(v) && v > 0) {
              console.log(`[OFFLINE] Found chaos price from gameModel:`, v);
              return v;
            }
          }
          if (gameModel.bonusPrices && typeof gameModel.bonusPrices === 'object') {
            const bonusPrice = gameModel.bonusPrices[bonusMode];
            if (bonusPrice) {
              const v = moneyToNumber(String(bonusPrice));
              if (isFinite(v) && v > 0) {
                console.log(`[OFFLINE] Found ${bonusMode} price from bonusPrices:`, v);
                return v;
              }
            }
          }
        }
      } catch (_) {}
      
      // Пытаемся найти через Cocos Creator объекты (cc.director, DependencyContainer)
      try {
        // Пробуем получить доступ к Cocos Creator через window.cc или глобальный cc
        const cc = window.cc || window.cclegacy || (typeof cc !== 'undefined' ? cc : null);
        if (cc && cc.director) {
          const scene = cc.director.getScene();
          if (scene) {
            // Ищем DependencyContainer или GameManager через рекурсивный обход
            function findInNode(node, depth = 0) {
              if (depth > 10 || !node) return null;
              try {
                // Проверяем компоненты узла
                if (node.getComponents) {
                  const components = node.getComponents(cc.Component);
                  for (const comp of components) {
                    if (!comp) continue;
                    const compName = comp.constructor.name || '';
                    
                    // Ищем UiBetModeManager и его Label компоненты с ценами
                    if (compName.includes('UiBetModeManager') || compName.includes('UiBet')) {
                      // Ищем Label компоненты: anteBetAmount, chaoseBetAmount
                      const labelFields = bonusMode === 'ante' 
                        ? ['anteBetAmount', 'anteBetText']
                        : ['chaoseBetAmount', 'chaosBetAmount', 'chaosBetText'];
                      
                      for (const fieldName of labelFields) {
                        try {
                          if (comp[fieldName]) {
                            const label = comp[fieldName];
                            // Пытаемся получить текст из Label
                            let labelText = null;
                            if (label && typeof label === 'object') {
                              // Если это сам Label компонент
                              if (label._string !== undefined || label.string !== undefined) {
                                labelText = label._string || label.string || label.text;
                              }
                              // Если это Node с Label компонентом
                              else if (label.node && label.node.getComponent) {
                                const labelComp = label.node.getComponent(cc.Label);
                                if (labelComp) {
                                  labelText = labelComp._string || labelComp.string || labelComp.text;
                                }
                              }
                              // Если это Node, получаем Label напрямую
                              else if (label.getComponent) {
                                const labelComp = label.getComponent(cc.Label);
                                if (labelComp) {
                                  labelText = labelComp._string || labelComp.string || labelComp.text;
                                }
                              }
                            }
                            
                            if (labelText) {
                              const v = moneyToNumber(String(labelText));
                              if (isFinite(v) && v > 0) {
                                console.log(`[OFFLINE] Found ${bonusMode} price from ${compName}.${fieldName} Label:`, labelText, '=', v);
                                return v;
                              }
                            }
                          }
                        } catch (_) {}
                      }
                    }
                    
                    // Ищем менеджеры, которые могут хранить цены бонусов
                    if (compName.includes('BetMode') || compName.includes('GameManager')) {
                      // Ищем поля с ценами
                      for (const key in comp) {
                        if (!comp.hasOwnProperty(key)) continue;
                        const val = comp[key];
                        const keyLower = String(key).toLowerCase();
                        if ((keyLower.includes('price') || keyLower.includes('cost')) && 
                            (keyLower.includes('ante') || keyLower.includes('chaos') || keyLower.includes('bonus'))) {
                          const v = moneyToNumber(String(val));
                          if (isFinite(v) && v > 0) {
                            // Проверяем соответствие режиму
                            if ((bonusMode === 'ante' && keyLower.includes('ante')) ||
                                (bonusMode === 'chaos' && keyLower.includes('chaos'))) {
                              console.log(`[OFFLINE] Found ${bonusMode} price from ${compName}.${key}:`, v);
                              return v;
                            }
                          }
                        }
                        // Проверяем объекты с ценами
                        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                          if (val[bonusMode + 'Price'] || val[bonusMode + 'Cost'] || val[bonusMode]) {
                            const price = val[bonusMode + 'Price'] || val[bonusMode + 'Cost'] || val[bonusMode];
                            const v = moneyToNumber(String(price));
                            if (isFinite(v) && v > 0) {
                              console.log(`[OFFLINE] Found ${bonusMode} price from ${compName}.${key}.${bonusMode}:`, v);
                              return v;
                            }
                          }
                        }
                      }
                    }
                  }
                  
                  // Также ищем Label компоненты напрямую в узлах с именами
                  const nodeName = node.name || '';
                  const nodeNameLower = nodeName.toLowerCase();
                  // Ищем узлы с именами, содержащими anteBetAmount, chaosBetAmount и т.д.
                  const searchPatterns = bonusMode === 'ante'
                    ? ['antebetamount', 'antebet', 'antebettext', 'ante']
                    : ['chaosebetamount', 'chaosbetamount', 'chaosbet', 'chaosbettext', 'chaos'];
                  
                  for (const pattern of searchPatterns) {
                    if (nodeNameLower.includes(pattern)) {
                      // Пытаемся получить Label компонент
                      let labelComp = null;
                      try {
                        labelComp = node.getComponent(cc.Label);
                      } catch (_) {}
                      
                      if (labelComp) {
                        const labelText = labelComp._string || labelComp.string || labelComp.text;
                        if (labelText) {
                          const v = moneyToNumber(String(labelText));
                          if (isFinite(v) && v > 0) {
                            console.log(`[OFFLINE] Found ${bonusMode} price from node "${nodeName}" Label:`, labelText, '=', v);
                            return v;
                          }
                        }
                      }
                      // Если Label не найден напрямую, проверяем дочерние узлы с Label
                      if (node.children) {
                        for (const child of node.children) {
                          try {
                            const childLabel = child.getComponent(cc.Label);
                            if (childLabel) {
                              const childText = childLabel._string || childLabel.string || childLabel.text;
                              if (childText) {
                                const v = moneyToNumber(String(childText));
                                if (isFinite(v) && v > 0) {
                                  console.log(`[OFFLINE] Found ${bonusMode} price from node "${nodeName}" child Label:`, childText, '=', v);
                                  return v;
                                }
                              }
                            }
                          } catch (_) {}
                        }
                      }
                      break; // Если нашли узел, не ищем дальше
                    }
                  }
                }
                // Рекурсивно обходим дочерние узлы
                if (node.children && node.children.length > 0) {
                  for (const child of node.children) {
                    const result = findInNode(child, depth + 1);
                    if (result !== null) return result;
                  }
                }
              } catch (e) {
                // Игнорируем ошибки при обходе
              }
              return null;
            }
            
            const result = findInNode(scene);
            if (result !== null) return result;
            
            // Пробуем через DependencyContainer
            try {
              // Ищем DependencyContainer в глобальной области
              const deps = window.DependencyContainer || (cc && cc.DependencyContainer);
              if (deps && typeof deps.resolve === 'function') {
                // Сначала пытаемся получить UiBetModeManager, который содержит Label компоненты с ценами
                try {
                  const uiBetMgr = deps.resolve('UiBetModeManager');
                  if (uiBetMgr && typeof uiBetMgr === 'object') {
                    // Ищем Label компоненты: anteBetAmount и chaoseBetAmount (или chaosBetAmount)
                    const labelFieldNames = bonusMode === 'ante' 
                      ? ['anteBetAmount', 'anteBetText']
                      : ['chaoseBetAmount', 'chaosBetAmount', 'chaosBetText'];
                    
                    for (const fieldName of labelFieldNames) {
                      if (uiBetMgr[fieldName]) {
                        const label = uiBetMgr[fieldName];
                        // Проверяем, что это Label компонент (Cocos Creator)
                        if (label && typeof label === 'object') {
                          // Пытаемся получить текст из Label
                          let labelText = null;
                          try {
                            // В Cocos Creator Label имеет свойство _string или string
                            labelText = label._string || label.string || label.text || 
                                       (label.getComponent && label.getComponent(cc && cc.Label) ? 
                                        (label.getComponent(cc.Label)._string || label.getComponent(cc.Label).string) : null);
                            // Также проверяем через node
                            if (!labelText && label.node) {
                              const labelComp = label.node.getComponent ? label.node.getComponent(cc && cc.Label) : null;
                              if (labelComp) {
                                labelText = labelComp._string || labelComp.string || labelComp.text;
                              }
                            }
                          } catch (_) {}
                          
                          if (labelText) {
                            const v = moneyToNumber(String(labelText));
                            if (isFinite(v) && v > 0) {
                              console.log(`[OFFLINE] Found ${bonusMode} price from UiBetModeManager.${fieldName} Label text:`, labelText, '=', v);
                              return v;
                            }
                          }
                        }
                      }
                    }
                  }
                } catch (_) {}
                
                // Пытаемся получить GameManager, UiBetModeManager и т.д.
                const managers = ['GameManager', 'UiBetModeManager', 'BetModeCalculatorDropTheDonLevel', 'BetModeCalculator', 'IBetModeCalculator'];
                for (const mgrName of managers) {
                  try {
                    const mgr = deps.resolve(mgrName);
                    if (mgr && typeof mgr === 'object') {
                      // Ищем цены в менеджере
                      for (const key in mgr) {
                        if (!mgr.hasOwnProperty(key)) continue;
                        const val = mgr[key];
                        const keyLower = String(key).toLowerCase();
                        if ((keyLower.includes('price') || keyLower.includes('cost')) && 
                            (keyLower.includes(bonusMode) || keyLower.includes('bonus'))) {
                          const v = moneyToNumber(String(val));
                          if (isFinite(v) && v > 0) {
                            console.log(`[OFFLINE] Found ${bonusMode} price from ${mgrName}.${key}:`, v);
                            return v;
                          }
                        }
                        // Проверяем методы, которые могут вернуть цену
                        if (typeof val === 'function') {
                          const funcName = String(key).toLowerCase();
                          if ((funcName.includes('get') && (funcName.includes('price') || funcName.includes('cost') || funcName.includes('bet'))) ||
                              funcName.includes('calculate')) {
                            try {
                              // Пробуем вызвать с разными параметрами
                              let priceResult = null;
                              try {
                                priceResult = val.call(mgr, bonusMode);
                              } catch (_) {
                                try {
                                  priceResult = val.call(mgr);
                                } catch (_) {}
                              }
                              if (priceResult != null) {
                                // Если это объект с costMult и betValue, рассчитываем цену
                                if (typeof priceResult === 'object' && priceResult.costMult && priceResult.betValue) {
                                  const calculatedPrice = Number(priceResult.betValue) * Number(priceResult.costMult);
                                  const v = moneyToNumber(String(calculatedPrice));
                                  if (isFinite(v) && v > 0) {
                                    console.log(`[OFFLINE] Found ${bonusMode} price from ${mgrName}.${key}() (calculated: betValue * costMult):`, v);
                                    return v;
                                  }
                                } else {
                                  const v = moneyToNumber(String(priceResult));
                                  if (isFinite(v) && v > 0) {
                                    console.log(`[OFFLINE] Found ${bonusMode} price from ${mgrName}.${key}():`, v);
                                    return v;
                                  }
                                }
                              }
                            } catch (_) {}
                          }
                        }
                        // Проверяем объекты с costMult и betValue (например, из NewBetValue события)
                        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                          if (val.costMult && val.betValue) {
                            const calculatedPrice = Number(val.betValue) * Number(val.costMult);
                            const v = moneyToNumber(String(calculatedPrice));
                            if (isFinite(v) && v > 0) {
                              console.log(`[OFFLINE] Found ${bonusMode} price from ${mgrName}.${key} (calculated: betValue * costMult):`, v);
                              return v;
                            }
                          }
                          // Также проверяем вложенные объекты
                          if (val[bonusMode + 'Price'] || val[bonusMode + 'Cost'] || val[bonusMode]) {
                            const price = val[bonusMode + 'Price'] || val[bonusMode + 'Cost'] || val[bonusMode];
                            const v = moneyToNumber(String(price));
                            if (isFinite(v) && v > 0) {
                              console.log(`[OFFLINE] Found ${bonusMode} price from ${mgrName}.${key}.${bonusMode}:`, v);
                              return v;
                            }
                          }
                        }
                      }
                    }
                  } catch (_) {}
                }
              }
            } catch (_) {}
            
            // Пробуем найти через EventSystem или глобальные переменные с NewBetValue
            try {
              if (deps && typeof deps.resolve === 'function') {
                // Пытаемся получить EventSystem и найти последнее NewBetValue событие
                const eventSystem = deps.resolve('IEventSystem');
                if (eventSystem && eventSystem._lastNewBetValue) {
                  const lastBetValue = eventSystem._lastNewBetValue;
                  if (lastBetValue.costMult && lastBetValue.betValue) {
                    const calculatedPrice = Number(lastBetValue.betValue) * Number(lastBetValue.costMult);
                    const v = moneyToNumber(String(calculatedPrice));
                    if (isFinite(v) && v > 0) {
                      console.log(`[OFFLINE] Found ${bonusMode} price from EventSystem._lastNewBetValue (calculated):`, v);
                      return v;
                    }
                  }
                }
              }
            } catch (_) {}
          }
        }
      } catch (e) {
        console.warn(`[OFFLINE] Error searching Cocos Creator objects for ${bonusMode} price:`, e);
      }
      
    } catch (e) {
      console.warn(`[OFFLINE] Error getting ${bonusMode} bonus price:`, e);
    }
    return NaN;
  }
  window.fetch = async function(url, options = {}) {
    // console.log('[OFFLINE] Fetch request:', url, 'method:', options.method || 'GET'); // Отключено для уменьшения засорения консоли
    // Общая переменная для извлечённой суммы ставки из тела запроса
    let __offlineRequestedBet = NaN;
    // Попытка получить ставку из UI
    let __offlineUiBet = __offlineGetUiBet();
    
    // Ранний перехват session/start - ДО поиска моков
    if (typeof url === 'string' && (url.includes('/session/start') || url.endsWith('/session/start'))) {
      // При активном реальном API не используем мок session/start
      if (typeof __useRealApi === 'function' && __useRealApi()) {
        // пропускаем — ниже запрос пойдёт в реальный API
      } else {
        console.log('[OFFLINE] Early intercept session/start:', url);
        // Ищем мок для session/start
        const sessionMock = apiMocks ? apiMocks.find(m => 
          m.method === (options.method || 'GET') && 
          (m.url.includes('/session/start') || m.pathname === '/session/start')
        ) : null;
        
        if (sessionMock) {
          const fetchPath = sessionMock.file.startsWith('/') ? sessionMock.file : (BASE + sessionMock.file);
          return fetch(fetchPath + ('?t=' + Date.now()), { cache: 'no-store' })
            .then(response => response.json())
            .then(mockData => {
              const mockResponse = mockData.response || mockData;
              let body;
              if (mockResponse.body) {
                body = typeof mockResponse.body === 'string' ? mockResponse.body : JSON.stringify(mockResponse.body);
              } else if (mockResponse.bodyB64) {
                body = atob(mockResponse.bodyB64);
              } else {
                body = JSON.stringify(mockResponse);
              }
              
              try {
                const parsed = JSON.parse(body);
                let defaultStart = 1000;
                try {
                  const startRaw = localStorage.getItem('OFFLINE_START_BALANCE');
                  if (startRaw != null) {
                    const startNum = Number(startRaw);
                    if (isFinite(startNum)) defaultStart = startNum;
                  }
                } catch (_) {}
                let currencyFactor = 1000000;
                try {
                  const cf = Number(localStorage.getItem('OFFLINE_CURRENCY_FACTOR'));
                  if (isFinite(cf) && cf > 0) currencyFactor = cf;
                } catch (_) {}
                
                const startBalanceUnits = Math.round(defaultStart * currencyFactor);
                console.log('[OFFLINE] [EARLY] Setting start balance to:', defaultStart, '$ =', startBalanceUnits, 'units');
                
                if (parsed && parsed.balance && typeof parsed.balance === 'object') {
                  parsed.balance.amount = startBalanceUnits;
                  body = JSON.stringify(parsed);
                }
                try { localStorage.setItem('OFFLINE_BALANCE', String(startBalanceUnits)); } catch (_) {}
                
                const headers = new Headers();
                headers.set('Content-Type', 'application/json');
                return new Response(body, {
                  status: mockResponse.status || 200,
                  statusText: mockResponse.statusText || 'OK',
                  headers
                });
              } catch (e) {
                console.error('[OFFLINE] [EARLY] session/start parse error:', e);
                const headers = new Headers();
                headers.set('Content-Type', 'application/json');
                return new Response(body, {
                  status: mockResponse.status || 200,
                  statusText: mockResponse.statusText || 'OK',
                  headers
                });
              }
            })
            .catch(e => {
              console.error('[OFFLINE] [EARLY] session/start fetch error:', e);
              return originalFetch.call(this, url, options);
            });
        }
      }
    }
    
    // Если включено проксирование к реальному API - делаем реальный запрос
    if (typeof url === 'string' && __useRealApi()) {
      try {
        const realApiUrl = __getRealApiUrl();
        // Временное логирование для диагностики
        if (url.includes('/wallet/authenticate') || url.includes('/wallet/play')) {
          console.log('[OFFLINE][REAL_API] 🔍 Using API URL:', realApiUrl);
          console.log('[OFFLINE][REAL_API] 🔍 Current URL params:', window.location.search);
          console.log('[OFFLINE][REAL_API] 🔍 localStorage rgs_url:', localStorage.getItem('OFFLINE_REAL_API_URL'));
        }
        let requestUrl = url;
        
        // РАННЕЕ логирование - для диагностики (отключено для уменьшения засорения консоли)
        // console.log('[OFFLINE][REAL_API] 🔍 Intercepted fetch request:', {
        //   url: url,
        //   method: options.method || 'GET',
        //   hasBody: !!options.body,
        //   realApiUrl: realApiUrl
        // });
        
        // Исправляем проблему с undefined в URL
        if (url.includes('undefined')) {
          // Если URL содержит undefined, извлекаем путь после undefined
          const pathMatch = url.match(/undefined(\/.*)/);
          if (pathMatch && pathMatch[1]) {
            url = pathMatch[1]; // Используем только путь
          } else {
            // Если не удалось извлечь, пытаемся найти путь другим способом
            const parts = url.split('/');
            const pathIndex = parts.findIndex(p => p === 'undefined');
            if (pathIndex >= 0 && pathIndex < parts.length - 1) {
              url = '/' + parts.slice(pathIndex + 1).join('/');
            }
          }
        }
        
        // Проверяем, является ли URL запросом к реальному API
        const isRealApiRequest = url.includes('rgs.twist-rgs.com') || 
                                 url.includes(realApiUrl) ||
                                 url.startsWith('/wallet/') ||
                                 url.startsWith('/session/') ||
                                 url.includes('/wallet/') ||
                                 url.includes('/session/');
        
        if (isRealApiRequest) {
          // Если это полный URL к реальному API, используем его как есть
          if (url.startsWith('http://') || url.startsWith('https://')) {
            // Если URL уже содержит нужный домен, оставляем как есть
            if (url.includes(realApiUrl)) {
              requestUrl = url;
            } else {
              // Если это другой домен, заменяем на реальный API
              try {
                const urlObj = new URL(url);
                requestUrl = realApiUrl + urlObj.pathname + (urlObj.search || '');
              } catch (e) {
                // Если не удалось распарсить, извлекаем путь вручную
                const pathMatch = url.match(/https?:\/\/[^\/]+(\/.*)/);
                if (pathMatch && pathMatch[1]) {
                  requestUrl = realApiUrl + pathMatch[1];
                } else {
                  requestUrl = url; // Оставляем как есть при ошибке
                }
              }
            }
          } else {
            // Если это относительный путь, добавляем реальный API URL
            // Извлекаем путь, игнорируя возможный undefined в начале
            let cleanPath = url;
            if (cleanPath.startsWith('undefined')) {
              cleanPath = cleanPath.replace(/^undefined/, '');
            }
            if (!cleanPath.startsWith('/')) {
              cleanPath = '/' + cleanPath;
            }
            requestUrl = realApiUrl + cleanPath;
          }
          
          // ДЕТАЛЬНОЕ логирование всех параметров запроса (отключено для уменьшения засорения консоли)
          // Оставляем только важные логи об ошибках
          
          // Обрабатываем тело запроса: делаем amount строкой и используем сохраненный sessionID
          let processedBody = options.body;
          if (options.body) {
            try {
              let bodyObj;
              if (typeof options.body === 'string') {
                bodyObj = JSON.parse(options.body);
              } else {
                bodyObj = options.body;
              }
              
              // Обрабатываем amount: для /wallet/authenticate не трогаем, для /wallet/play оставляем числом
              // (API может требовать число для /wallet/play, а не строку)
              // НЕ преобразуем amount в строку для всех запросов - только если API требует
              
              // ВАЖНО: НЕ добавляем access_token в тело запроса - API его не использует
              // access_token используется только в URL, но не отправляется в теле запроса
              
              // Обрабатываем sessionID: приоритет - из URL параметров, затем из localStorage
              // ВАЖНО: API требует sessionID для всех запросов, даже если он null
              if (bodyObj && typeof bodyObj === 'object') {
                // ПРИОРИТЕТ 1: sessionID из URL параметров (как на оригинальном сайте)
                let finalSessionID = null;
                try {
                  const urlParams = new URLSearchParams(window.location.search);
                  const urlSessionID = urlParams.get('sessionID');
                  if (urlSessionID && urlSessionID.trim()) {
                    finalSessionID = urlSessionID.trim();
                    // Сохраняем для будущих запросов
                    try {
                      localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', finalSessionID);
                      console.log('[OFFLINE][REAL_API] ✅ Using sessionID from URL:', finalSessionID);
                    } catch (e) {
                      console.warn('[OFFLINE][REAL_API] Failed to save sessionID to localStorage:', e);
                    }
                  } else {
                    console.log('[OFFLINE][REAL_API] 🔍 No sessionID in URL. Current URL:', window.location.href);
                  }
                } catch (e) {
                  console.warn('[OFFLINE][REAL_API] Error parsing URL for sessionID:', e);
                }
                
                // ПРИОРИТЕТ 2: sessionID из localStorage (если не найден в URL)
                // Проверяем оба ключа: OFFLINE_REAL_API_SESSION_ID и LAST_SESSION_ID
                if (!finalSessionID) {
                  try {
                    let savedSessionID = localStorage.getItem('OFFLINE_REAL_API_SESSION_ID');
                    if (!savedSessionID) {
                      // Пробуем получить из LAST_SESSION_ID (используется в index.html)
                      savedSessionID = localStorage.getItem('LAST_SESSION_ID');
                      if (savedSessionID) {
                        // Синхронизируем: сохраняем в OFFLINE_REAL_API_SESSION_ID для будущих запросов
                        localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', savedSessionID.trim());
                        console.log('[OFFLINE][REAL_API] 🔄 Synced LAST_SESSION_ID to OFFLINE_REAL_API_SESSION_ID');
                      }
                    }
                    if (savedSessionID && savedSessionID.trim()) {
                      finalSessionID = savedSessionID.trim();
                    }
                  } catch (e) {}
                }
                
                // ПРИОРИТЕТ 3: sessionID из тела запроса (если есть и не null)
                if (!finalSessionID && bodyObj.sessionID !== null && bodyObj.sessionID !== undefined && bodyObj.sessionID !== '') {
                  finalSessionID = String(bodyObj.sessionID);
                  try { localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', finalSessionID); } catch (e) {}
                }
                
                // Больше не автозапускаем /session/start из перехвата — опираемся на sessionID из URL/LS
                
                // Устанавливаем финальный sessionID (или null, если не найден)
                bodyObj.sessionID = finalSessionID || null;
                
                if (requestUrl.includes('/wallet/authenticate') && !finalSessionID) {
                  console.warn('[OFFLINE][REAL_API] ⚠️ No sessionID found for /wallet/authenticate');
                  console.warn('[OFFLINE][REAL_API] 🔍 URL params:', window.location.search);
                  console.warn('[OFFLINE][REAL_API] 🔍 localStorage OFFLINE_REAL_API_SESSION_ID:', localStorage.getItem('OFFLINE_REAL_API_SESSION_ID'));
                  console.warn('[OFFLINE][REAL_API] 🔍 localStorage LAST_SESSION_ID:', localStorage.getItem('LAST_SESSION_ID'));
                  
                  // Если sessionID все еще не найден, пробуем еще раз получить из URL (возможно, он был добавлен через postMessage)
                  // и возвращаем fallback ответ сразу, чтобы избежать ошибки 400
                  try {
                    const urlParamsRetry = new URLSearchParams(window.location.search);
                    const retrySessionID = urlParamsRetry.get('sessionID');
                    if (retrySessionID && retrySessionID.trim()) {
                      finalSessionID = retrySessionID.trim();
                      bodyObj.sessionID = finalSessionID;
                      console.log('[OFFLINE][REAL_API] ✅ Found sessionID in URL on retry:', finalSessionID.substring(0, 20) + '...');
                    }
                  } catch (e) {}
                }
              }
              
              // Для /wallet/authenticate: очищаем тело запроса от лишних полей
              // API ожидает только sessionID и gameID (как на оригинальном сайте)
              if (requestUrl.includes('/wallet/authenticate') && bodyObj && typeof bodyObj === 'object') {
                const cleanBody = {
                  sessionID: bodyObj.sessionID || null,
                  gameID: bodyObj.gameID || '0196ecd0-c06c-74ca-9bc9-e6b3310f1651'
                };
                bodyObj = cleanBody;
              }
              
              processedBody = JSON.stringify(bodyObj);
              
              // ВРЕМЕННОЕ детальное логирование для /wallet/authenticate (для диагностики)
              if (requestUrl.includes('/wallet/authenticate')) {
                console.log('[OFFLINE][REAL_API] 🔍 AUTHENTICATE REQUEST BODY:', JSON.stringify(bodyObj, null, 2));
                console.log('[OFFLINE][REAL_API] 🔍 AUTHENTICATE REQUEST URL:', requestUrl);
                // Декодируем JWT токен для диагностики
                try {
                  const urlParams = new URLSearchParams(window.location.search);
                  const accessToken = urlParams.get('access_token');
                  if (accessToken) {
                    const payload = JSON.parse(atob(accessToken.split('.')[1]));
                    console.log('[OFFLINE][REAL_API] 🔍 JWT PAYLOAD:', JSON.stringify(payload, null, 2));
                  }
                } catch (e) {
                  console.warn('[OFFLINE][REAL_API] Failed to decode JWT:', e);
                }
              }
              
              // Логируем обработанное тело запроса (отключено для уменьшения засорения консоли)
              // console.log('[OFFLINE][REAL_API] Processed request body (full):', processedBody);
              // console.log('[OFFLINE][REAL_API] Processed request body (parsed):', JSON.stringify(bodyObj, null, 2));
            } catch (e) {
              console.error('[OFFLINE][REAL_API] Error processing request body:', e);
              console.log('[OFFLINE][REAL_API] Using original body due to error');
              // Если не удалось обработать, используем оригинальный body
              processedBody = options.body;
            }
          } else {
            // console.log('[OFFLINE][REAL_API] Request body: (empty, no processing needed)');
          }
          
          // Если sessionID все еще null для /wallet/authenticate после всех попыток, возвращаем fallback ответ ДО отправки запроса
          if (requestUrl.includes('/wallet/authenticate')) {
            try {
              const bodyObjCheck = processedBody ? JSON.parse(processedBody) : null;
              if (bodyObjCheck && (!bodyObjCheck.sessionID || bodyObjCheck.sessionID === null)) {
                console.warn('[OFFLINE][REAL_API] ⚠️ sessionID is null for /wallet/authenticate after all attempts, returning fallback response');
                
                // Получаем баланс из localStorage
                let balance = 1000000000; // Дефолт 1000$
                try {
                  const storedBalance = Number(localStorage.getItem('OFFLINE_BALANCE'));
                  if (isFinite(storedBalance) && storedBalance > 0) {
                    balance = storedBalance;
                  } else {
                    let currencyFactor = 1000000;
                    try {
                      const cf = Number(localStorage.getItem('OFFLINE_CURRENCY_FACTOR'));
                      if (isFinite(cf) && cf > 0) currencyFactor = cf;
                    } catch (_) {}
                    let defaultStart = 1000;
                    try {
                      const s = Number(localStorage.getItem('OFFLINE_START_BALANCE'));
                      if (isFinite(s) && s > 0) defaultStart = s;
                    } catch (_) {}
                    balance = Math.round(defaultStart * currencyFactor);
                  }
                } catch (e) {}
                
                // Возвращаем успешный ответ (структура как в реальном API)
                const successResponse = {
                  balance: {
                    cash: balance,
                    bonus: 0
                  },
                  currency: localStorage.getItem('OFFLINE_REAL_API_CURRENCY') || 'USD'
                };
                
                return Promise.resolve(new Response(JSON.stringify(successResponse), {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  }
                }));
              }
            } catch (e) {
              // Если не удалось распарсить body, продолжаем с обычным запросом
              console.warn('[OFFLINE][REAL_API] Failed to check sessionID in request body:', e);
            }
          }
          
          // Копируем опции запроса
          const proxyOptions = {
            method: options.method || 'GET',
            headers: new Headers(),
            body: processedBody,
            // Убираем credentials: 'include' из-за CORS ограничений
            // Если сервер возвращает Access-Control-Allow-Origin: *, то credentials не может быть 'include'
            // credentials: 'same-origin', // Используем same-origin вместо include
            mode: 'cors'
          };
          
          // Копируем заголовки из оригинального запроса
          if (options.headers) {
            if (options.headers instanceof Headers) {
              options.headers.forEach((value, key) => {
                // Исключаем некоторые заголовки, которые браузер добавит сам
                if (!['host', 'origin', 'referer'].includes(key.toLowerCase())) {
                  proxyOptions.headers.set(key, value);
                }
              });
            } else if (typeof options.headers === 'object') {
              Object.entries(options.headers).forEach(([key, value]) => {
                if (!['host', 'origin', 'referer'].includes(key.toLowerCase())) {
                  proxyOptions.headers.set(key, value);
                }
              });
            }
          }
          
          // Добавляем необходимые заголовки для CORS
          proxyOptions.headers.set('Content-Type', 'application/json');
          proxyOptions.headers.set('Accept', 'application/json');
          
          // НЕ добавляем Authorization заголовок, чтобы избежать preflight запроса
          // Токен передается в теле запроса (access_token поле)
          // Это позволяет избежать OPTIONS preflight, который блокируется сервером
          
          // Логируем все заголовки (отключено для уменьшения засорения консоли)
          // console.log('[OFFLINE][REAL_API] 🔍 Final request headers:');
          // proxyOptions.headers.forEach((value, key) => {
          //   console.log('[OFFLINE][REAL_API]   ', key + ':', value);
          // });
          
          // ПРИМЕЧАНИЕ: Origin - это защищенный заголовок, браузер устанавливает его автоматически
          // Мы не можем его переопределить. Referer можно установить, но это не поможет с CORS проверками.
          // API должен принимать запросы с любого origin (Access-Control-Allow-Origin: *)
          
          // Делаем реальный запрос к API
          return originalFetch(requestUrl, proxyOptions)
            .then(async response => {
              // Логирование ответа (только при ошибках)
              const responseClone = response.clone();
              let responseText = '';
              try {
                responseText = await responseClone.text();
                
                // Пытаемся распарсить как JSON
                try {
                  const responseJson = JSON.parse(responseText);
                  
                  // Если есть ошибка - логируем детально
                  if (responseJson.error || response.status >= 400) {
                    console.error('[OFFLINE][REAL_API] ❌ ERROR:', responseJson.error || 'HTTP ' + response.status, '-', responseJson.message || 'No message');
                    console.error('[OFFLINE][REAL_API] Request URL:', requestUrl);
                    console.error('[OFFLINE][REAL_API] Response:', JSON.stringify(responseJson, null, 2));
                  }
                } catch (e) {
                  // Если не JSON, логируем только при ошибке
                  if (response.status >= 400) {
                    console.error('[OFFLINE][REAL_API] ❌ ERROR (non-JSON):', response.status, response.statusText);
                    console.error('[OFFLINE][REAL_API] Request URL:', requestUrl);
                    console.error('[OFFLINE][REAL_API] Response body:', responseText);
                  }
                }
              } catch (e) {
                if (response.status >= 400) {
                  console.error('[OFFLINE][REAL_API] Failed to read response:', e);
                }
              }
              
              // Для успешных ответов от /wallet/authenticate (200 OK) - сохраняем sessionID
              if (response.status === 200 && requestUrl.includes('/wallet/authenticate')) {
                // Клонируем ответ для чтения без влияния на основной поток
                const tempResponse = response.clone();
                try {
                  const tempData = await tempResponse.json();
                  if (tempData && tempData.sessionID) {
                    try {
                      localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', String(tempData.sessionID));
                      console.log('[OFFLINE][REAL_API] ✅ Saved sessionID from successful authenticate (200):', tempData.sessionID);
                    } catch (e) {
                      console.warn('[OFFLINE][REAL_API] Failed to save sessionID from 200 response:', e);
                    }
                  }
                } catch (e) {
                  // Игнорируем ошибки парсинга при сохранении sessionID
                }
              }
              
              // Специальная обработка для 404 ошибок (например, /session/start не существует на некоторых хостах)
              if (response.status === 404 && requestUrl.includes('/session/start')) {
                console.log('[OFFLINE][REAL_API] /session/start returned 404, returning fallback response');
                
                // Возвращаем успешный ответ с дефолтными данными
                // Игра может продолжить работу без sessionID (если он уже есть в URL)
                const fallbackResponse = {
                  sessionID: null,
                  config: {
                    gameID: '',
                    minBet: 100000,
                    maxBet: 1000000000,
                    stepBet: 10000,
                    defaultBetLevel: 1000000,
                    betLevels: [100000, 200000, 400000, 600000, 800000, 1000000, 1200000, 1400000, 1600000, 1800000, 2000000, 3000000, 4000000, 5000000, 6000000, 7000000, 8000000, 9000000, 10000000, 12000000, 14000000, 16000000, 18000000, 20000000, 30000000, 40000000, 50000000, 75000000, 100000000, 150000000, 200000000, 250000000, 300000000, 350000000, 400000000, 450000000, 500000000, 750000000, 1000000000],
                    betModes: {},
                    jurisdiction: {
                      socialCasino: false,
                      disabledFullscreen: false,
                      disabledTurbo: false,
                      disabledSuperTurbo: false,
                      disabledAutoplay: false,
                      disabledSlamstop: false,
                      disabledSpacebar: false,
                      disabledBuyFeature: false,
                      displayNetPosition: false,
                      displayRTP: false,
                      displaySessionTimer: false,
                      minimumRoundDuration: 0
                    }
                  }
                };
                
                return new Response(JSON.stringify(fallbackResponse), {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  }
                });
              }
              
              // Специальная обработка для 400 ошибок - возвращаем успешный ответ с локальными данными
              // Проверяем ДО попытки парсить ответ, так как сервер может вернуть text/plain
              if (response.status === 400) {
                if (requestUrl.includes('/wallet/authenticate')) {
                  console.log('[OFFLINE][REAL_API] Authenticate returned 400, returning success response with local balance');
                  
                  // Получаем баланс из localStorage
                  let balance = 1000000000; // Дефолт 1000$
                  try {
                    const storedBalance = Number(localStorage.getItem('OFFLINE_BALANCE'));
                    if (isFinite(storedBalance) && storedBalance > 0) {
                      balance = storedBalance;
                    } else {
                      let currencyFactor = 1000000;
                      try {
                        const cf = Number(localStorage.getItem('OFFLINE_CURRENCY_FACTOR'));
                        if (isFinite(cf) && cf > 0) currencyFactor = cf;
                      } catch (_) {}
                      let defaultStart = 1000;
                      try {
                        const s = Number(localStorage.getItem('OFFLINE_START_BALANCE'));
                        if (isFinite(s) && s > 0) defaultStart = s;
                      } catch (_) {}
                      balance = Math.round(defaultStart * currencyFactor);
                    }
                  } catch (e) {}
                  
                  // Возвращаем успешный ответ (структура как в реальном API)
                  const successResponse = {
                    balance: {
                      amount: balance,
                      currency: 'USD'
                    },
                    round: null,
                    config: {
                      gameID: '',
                      minBet: 100000,
                      maxBet: 1000000000,
                      stepBet: 10000,
                      defaultBetLevel: 1000000,
                      betLevels: [100000, 200000, 400000, 600000, 800000, 1000000, 1200000, 1400000, 1600000, 1800000, 2000000, 3000000, 4000000, 5000000, 6000000, 7000000, 8000000, 9000000, 10000000, 12000000, 14000000, 16000000, 18000000, 20000000, 30000000, 40000000, 50000000, 75000000, 100000000, 150000000, 200000000, 250000000, 300000000, 350000000, 400000000, 450000000, 500000000, 750000000, 1000000000],
                      betModes: {},
                      jurisdiction: {
                        socialCasino: false,
                        disabledFullscreen: false,
                        disabledTurbo: false,
                        disabledSuperTurbo: false,
                        disabledAutoplay: false,
                        disabledSlamstop: false,
                        disabledSpacebar: false,
                        disabledBuyFeature: false,
                        displayNetPosition: false,
                        displayRTP: false,
                        displaySessionTimer: false,
                        minimumRoundDuration: 0
                      }
                    }
                  };
                  
                  return new Response(JSON.stringify(successResponse), {
                    status: 200,
                    statusText: 'OK',
                    headers: {
                      'Content-Type': 'application/json',
                      'Access-Control-Allow-Origin': '*'
                    }
                  });
                } else if (requestUrl.includes('/wallet/play')) {
                  console.log('[OFFLINE][REAL_API] Wallet/play returned 400, returning success response with normalized data');
                  
                  // Получаем баланс из localStorage
                  let balance = 1000000000;
                  try {
                    const storedBalance = Number(localStorage.getItem('OFFLINE_BALANCE'));
                    if (isFinite(storedBalance) && storedBalance > 0) {
                      balance = storedBalance;
                    } else {
                      let currencyFactor = 1000000;
                      try {
                        const cf = Number(localStorage.getItem('OFFLINE_CURRENCY_FACTOR'));
                        if (isFinite(cf) && cf > 0) currencyFactor = cf;
                      } catch (_) {}
                      let defaultStart = 1000;
                      try {
                        const s = Number(localStorage.getItem('OFFLINE_START_BALANCE'));
                        if (isFinite(s) && s > 0) defaultStart = s;
                      } catch (_) {}
                      balance = Math.round(defaultStart * currencyFactor);
                    }
                  } catch (e) {}
                  
                  // Извлекаем amount из запроса
                  let betAmount = 1000000; // 1$ по умолчанию
                  try {
                    if (options.body) {
                      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
                      const bodyObj = typeof options.body === 'string' ? JSON.parse(bodyStr) : options.body;
                      if (bodyObj && bodyObj.amount !== undefined) {
                        betAmount = Number(bodyObj.amount);
                      }
                    }
                  } catch (e) {}
                  
                  // Используем RTP систему для генерации множителя
                  let multiplier = 0;
                  try {
                    if (__rtp_enabled()) {
                      const tier = __rtp_getTier();
                      const target = __rtp_getTarget();
                      let outcomes = __rtp_outcomes_for_tier(tier);
                      outcomes = __rtp_calibrate(outcomes, target);
                      const pick = __rtp_pickOutcome(outcomes);
                      if (pick && isFinite(pick.mult) && pick.mult >= 0) {
                        multiplier = pick.mult;
                      }
                    }
                  } catch (e) {
                    console.warn('[OFFLINE][REAL_API] RTP error, using default multiplier 0:', e);
                  }
                  
                  const payout = Math.round(betAmount * multiplier);
                  
                  // Возвращаем успешный ответ с нормализованными данными
                  // Используем структуру, соответствующую реальному API
                  const successResponse = {
                    balance: {
                      amount: balance - betAmount, // Вычитаем ставку
                      currency: 'USD'
                    },
                    round: {
                      betID: Date.now(),
                      amount: betAmount,
                      payout: payout,
                      payoutMultiplier: multiplier,
                      active: true, // Реальный API возвращает true
                      state: [{
                        data: '',
                        type: 'default'
                      }],
                      mode: 'base',
                      event: null
                    }
                  };
                  
                  return new Response(JSON.stringify(successResponse), {
                    status: 200,
                    statusText: 'OK',
                    headers: {
                      'Content-Type': 'application/json',
                      'Access-Control-Allow-Origin': '*'
                    }
                  });
                }
              }
              
              // Клонируем ответ для обработки
              const clonedResponse = response.clone();
              
              // Проверяем Content-Type перед парсингом
              const contentType = response.headers.get('content-type') || '';
              const isJson = contentType.includes('application/json');
              
              // Читаем и нормализуем ответ
              try {
                let responseData;
                if (isJson) {
                  try {
                    responseData = await clonedResponse.json();
                  } catch (e) {
                    // Если не удалось распарсить JSON, пытаемся прочитать как текст
                    console.warn('[OFFLINE][REAL_API] Failed to parse JSON, trying text:', e);
                    const text = await clonedResponse.text();
                    if (text && text.trim() && text !== 'undefined' && text.trim() !== 'undefined') {
                      try {
                        responseData = JSON.parse(text);
                      } catch (e2) {
                        console.warn('[OFFLINE][REAL_API] Failed to parse text as JSON:', text.substring(0, 100));
                        responseData = {};
                      }
                    } else {
                      console.warn('[OFFLINE][REAL_API] Response text is empty or "undefined"');
                      responseData = {};
                    }
                  }
                } else {
                  // Если не JSON, пытаемся прочитать как текст и распарсить
                  const text = await clonedResponse.text();
                  if (text && text.trim() && text !== 'undefined' && text.trim() !== 'undefined') {
                    try {
                      responseData = JSON.parse(text);
                    } catch (e) {
                      // Если не удалось распарсить, создаем пустой объект
                      console.warn('[OFFLINE][REAL_API] Failed to parse response as JSON, text:', text.substring(0, 100));
                      responseData = {};
                    }
                  } else {
                    // Если текст пустой или "undefined", создаем пустой объект
                    console.warn('[OFFLINE][REAL_API] Response text is empty or "undefined", creating empty object');
                    responseData = {};
                  }
                }
                
                // Проверяем что responseData валиден
                if (!responseData || typeof responseData !== 'object') {
                  console.warn('[OFFLINE][REAL_API] Invalid responseData, creating empty object');
                  responseData = {};
                }
                
                // Нормализуем структуру ответа для совместимости с игрой
                // ВАЖНО: Сохраняем все поля из реального ответа, только дополняем недостающие
                // Используем responseData как источник, создаем normalizedResponse для результата
                let normalizedResponse;
                if (responseData && typeof responseData === 'object') {
                  // Создаем глубокую копию, чтобы сохранить все вложенные объекты и массивы
                  try {
                    normalizedResponse = JSON.parse(JSON.stringify(responseData));
                  } catch (e) {
                    // Если не удалось сделать глубокую копию, делаем поверхностную
                    normalizedResponse = { ...responseData };
                  }
                  
                  // Гарантируем наличие balance объекта
                  if (!normalizedResponse.balance) {
                    normalizedResponse.balance = {};
                  } else {
                    // Сохраняем все поля из balance (если это не глубокая копия)
                    if (!normalizedResponse.balance.hasOwnProperty || Object.keys(normalizedResponse.balance).length === 0) {
                      normalizedResponse.balance = { ...normalizedResponse.balance };
                    }
                  }
                  
                  // Если balance.amount отсутствует или невалиден, пытаемся создать из локального баланса
                  if (normalizedResponse.balance.amount === undefined || normalizedResponse.balance.amount === null) {
                    try {
                      const storedBalance = Number(localStorage.getItem('OFFLINE_BALANCE'));
                      if (isFinite(storedBalance) && storedBalance > 0) {
                        normalizedResponse.balance.amount = storedBalance;
                        console.log('[OFFLINE][REAL_API] Added balance from localStorage:', storedBalance);
                      } else {
                        // Дефолтный баланс
                        let currencyFactor = 1000000;
                        try {
                          const cf = Number(localStorage.getItem('OFFLINE_CURRENCY_FACTOR'));
                          if (isFinite(cf) && cf > 0) currencyFactor = cf;
                        } catch (_) {}
                        let defaultStart = 1000;
                        try {
                          const s = Number(localStorage.getItem('OFFLINE_START_BALANCE'));
                          if (isFinite(s) && s > 0) defaultStart = s;
                        } catch (_) {}
                        normalizedResponse.balance.amount = Math.round(defaultStart * currencyFactor);
                        console.log('[OFFLINE][REAL_API] Added default balance:', normalizedResponse.balance.amount);
                      }
                    } catch (e) {
                      console.warn('[OFFLINE][REAL_API] Failed to set balance:', e);
                    }
                  }
                  
                  // Гарантируем currency
                  if (!normalizedResponse.balance.currency) {
                    normalizedResponse.balance.currency = 'USD';
                  }
                  
                  // Для wallet/authenticate - проверяем наличие config и сохраняем sessionID
                  if (requestUrl.includes('/wallet/authenticate')) {
                    // Извлекаем и сохраняем sessionID из ответа (если есть)
                    // Проверяем в корне ответа
                    if (normalizedResponse.sessionID) {
                      try {
                        localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', String(normalizedResponse.sessionID));
                        console.log('[OFFLINE][REAL_API] ✅ Saved sessionID from authenticate response:', normalizedResponse.sessionID);
                      } catch (e) {
                        console.warn('[OFFLINE][REAL_API] Failed to save sessionID:', e);
                      }
                    }
                    // Также проверяем в config.sessionID
                    if (normalizedResponse.config && normalizedResponse.config.sessionID) {
                      try {
                        localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', String(normalizedResponse.config.sessionID));
                        console.log('[OFFLINE][REAL_API] ✅ Saved sessionID from config.sessionID:', normalizedResponse.config.sessionID);
                      } catch (e) {}
                    }
                    // Проверяем в responseData напрямую (до нормализации)
                    if (responseData && responseData.sessionID) {
                      try {
                        localStorage.setItem('OFFLINE_REAL_API_SESSION_ID', String(responseData.sessionID));
                        console.log('[OFFLINE][REAL_API] ✅ Saved sessionID from responseData:', responseData.sessionID);
                      } catch (e) {}
                    }
                    
                    if (!normalizedResponse.config) {
                      normalizedResponse.config = {
                        gameID: '',
                        minBet: 100000,
                        maxBet: 1000000000,
                        stepBet: 10000,
                        defaultBetLevel: 1000000,
                        betLevels: [100000, 200000, 400000, 600000, 800000, 1000000, 1200000, 1400000, 1600000, 1800000, 2000000, 3000000, 4000000, 5000000, 6000000, 7000000, 8000000, 9000000, 10000000, 12000000, 14000000, 16000000, 18000000, 20000000, 30000000, 40000000, 50000000, 75000000, 100000000, 150000000, 200000000, 250000000, 300000000, 350000000, 400000000, 450000000, 500000000, 750000000, 1000000000],
                        betModes: {},
                        jurisdiction: {
                          socialCasino: false,
                          disabledFullscreen: false,
                          disabledTurbo: false,
                          disabledSuperTurbo: false,
                          disabledAutoplay: false,
                          disabledSlamstop: false,
                          disabledSpacebar: false,
                          disabledBuyFeature: false,
                          displayNetPosition: false,
                          displayRTP: false,
                          displaySessionTimer: false,
                          minimumRoundDuration: 0
                        }
                      };
                    }
                    // Гарантируем round: null для authenticate (сохраняем если уже есть)
                    if (normalizedResponse.round === undefined) {
                      normalizedResponse.round = null;
                    }
                  }
                  
                  // Гарантируем наличие round объекта для wallet/play
                  if (requestUrl.includes('/wallet/play')) {
                    if (!normalizedResponse.round) {
                      normalizedResponse.round = {};
                    } else {
                      // Сохраняем все поля из round
                      normalizedResponse.round = { ...normalizedResponse.round };
                    }
                    
                    // Гарантируем, что round.state существует и является массивом
                    if (!normalizedResponse.round.state) {
                      normalizedResponse.round.state = [];
                    } else if (!Array.isArray(normalizedResponse.round.state)) {
                      // Если state не массив, создаем массив
                      normalizedResponse.round.state = [normalizedResponse.round.state];
                    }
                    
                    // Гарантируем наличие других важных полей
                    // Структура state: массив объектов с полями data, type, metaTags
                    if (normalizedResponse.round.state.length === 0) {
                      // Если state пустой, создаем дефолтный элемент
                      normalizedResponse.round.state = [{
                        data: '',
                        type: 'default'
                      }];
                    } else {
                      // Гарантируем, что каждый элемент state имеет правильную структуру
                      // Копируем все поля из реального ответа, но гарантируем наличие обязательных
                      normalizedResponse.round.state = normalizedResponse.round.state.map((item, index) => {
                        if (!item || typeof item !== 'object') {
                          return { data: '', type: 'default' };
                        }
                        // Создаем новый объект, сохраняя ВСЕ существующие поля (включая id, simulationDataId и т.д.)
                        // Используем глубокую копию, чтобы сохранить все вложенные объекты (например, metaTags)
                        let normalizedItem;
                        try {
                          normalizedItem = JSON.parse(JSON.stringify(item));
                        } catch (e) {
                          normalizedItem = { ...item };
                        }
                        
                        // Гарантируем наличие data (может быть пустой строкой)
                        if (normalizedItem.data === undefined || normalizedItem.data === null) {
                          normalizedItem.data = '';
                        }
                        // Гарантируем наличие type (только если отсутствует)
                        if (normalizedItem.type === undefined || normalizedItem.type === null) {
                          normalizedItem.type = 'default';
                        }
                        // metaTags должен быть массивом (если есть)
                        if (normalizedItem.metaTags !== undefined && !Array.isArray(normalizedItem.metaTags)) {
                          normalizedItem.metaTags = [];
                        }
                        // Сохраняем все остальные поля (id, simulationDataId и т.д.) - они уже скопированы
                        return normalizedItem;
                      });
                    }
                    
                    // Гарантируем наличие amount и payoutMultiplier
                    if (normalizedResponse.round.amount === undefined || normalizedResponse.round.amount === null) {
                      // Пытаемся извлечь из запроса
                      try {
                        if (options.body) {
                          const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
                          const bodyObj = typeof options.body === 'string' ? JSON.parse(bodyStr) : options.body;
                          if (bodyObj && bodyObj.amount !== undefined) {
                            // Преобразуем в число, если это строка
                            normalizedResponse.round.amount = typeof bodyObj.amount === 'string' ? Number(bodyObj.amount) : bodyObj.amount;
                          }
                        }
                      } catch (e) {}
                      
                      // Если не удалось, используем дефолт
                      if (normalizedResponse.round.amount === undefined || normalizedResponse.round.amount === null) {
                        normalizedResponse.round.amount = 1000000; // 1$ по умолчанию
                      }
                    }
                    
                    if (normalizedResponse.round.payoutMultiplier === undefined || normalizedResponse.round.payoutMultiplier === null) {
                      normalizedResponse.round.payoutMultiplier = 0; // Проигрыш по умолчанию
                    }
                    
                    if (normalizedResponse.round.payout === undefined || normalizedResponse.round.payout === null) {
                      normalizedResponse.round.payout = 0;
                    }
                    
                    // active должен быть true по умолчанию (реальный API возвращает true)
                    if (normalizedResponse.round.active === undefined) {
                      normalizedResponse.round.active = true;
                    }
                    
                    // Гарантируем наличие mode и event
                    if (normalizedResponse.round.mode === undefined) {
                      // Пытаемся извлечь из запроса
                      try {
                        if (options.body) {
                          const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
                          const bodyObj = typeof options.body === 'string' ? JSON.parse(bodyStr) : options.body;
                          if (bodyObj && bodyObj.mode) {
                            normalizedResponse.round.mode = bodyObj.mode;
                          }
                        }
                      } catch (e) {}
                      
                      if (normalizedResponse.round.mode === undefined) {
                        normalizedResponse.round.mode = 'base';
                      }
                    }
                    
                    if (normalizedResponse.round.event === undefined) {
                      normalizedResponse.round.event = null;
                    }
                    
                    // Гарантируем betID (если отсутствует)
                    if (normalizedResponse.round.betID === undefined || normalizedResponse.round.betID === null) {
                      normalizedResponse.round.betID = Date.now(); // Генерируем временный betID
                    }
                  }
                  
                  // Логирование (опционально)
                  if (localStorage.getItem('OFFLINE_LOG_REAL_API_RESPONSES') === '1') {
                    console.log('[OFFLINE][REAL_API] Normalized response data:', normalizedResponse);
                  }
                  
                  // Создаем новый Response с нормализованными данными
                  const normalizedBody = JSON.stringify(normalizedResponse);
                  return new Response(normalizedBody, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                  });
                } else {
                  // Если responseData не объект, создаем минимальный ответ
                  normalizedResponse = {
                    balance: {
                      amount: 1000000000,
                      currency: 'USD'
                    },
                    round: requestUrl.includes('/wallet/play') ? null : null
                  };
                  const normalizedBody = JSON.stringify(normalizedResponse);
                  return new Response(normalizedBody, {
                    status: 200,
                    statusText: 'OK',
                    headers: {
                      'Content-Type': 'application/json',
                      'Access-Control-Allow-Origin': '*'
                    }
                  });
                }
              } catch (parseError) {
                console.warn('[OFFLINE][REAL_API] Failed to parse/normalize response:', parseError);
                
                // Если не удалось распарсить - создаем нормализованный ответ с дефолтными данными
                // Это предотвращает ошибки парсинга в игре
                let balance = 1000000000;
                try {
                  const storedBalance = Number(localStorage.getItem('OFFLINE_BALANCE'));
                  if (isFinite(storedBalance) && storedBalance > 0) {
                    balance = storedBalance;
                  }
                } catch (e) {}
                
                const fallbackResponse = {
                  balance: {
                    amount: balance,
                    currency: 'USD'
                  },
                  round: null
                };
                
                // Если это wallet/play, добавляем round
                if (requestUrl.includes('/wallet/play')) {
                  let betAmount = 1000000;
                  try {
                    if (options.body) {
                      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
                      const bodyObj = typeof options.body === 'string' ? JSON.parse(bodyStr) : options.body;
                      if (bodyObj && bodyObj.amount !== undefined) {
                        betAmount = Number(bodyObj.amount);
                      }
                    }
                  } catch (e) {}
                  
                  fallbackResponse.round = {
                    betID: Date.now(),
                    amount: betAmount,
                    payout: 0,
                    payoutMultiplier: 0,
                    active: true,
                    state: [{ data: '', type: 'default' }],
                    mode: 'base',
                    event: null
                  };
                }
                
                return new Response(JSON.stringify(fallbackResponse), {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  }
                });
              }
              
              // Возвращаем оригинальный ответ если не удалось нормализовать
              // НО проверяем, что это не 400 ошибка (её мы уже обработали выше)
              if (response.status === 400) {
                // Если это 400 и мы дошли сюда, значит обработка не сработала
                // Создаем fallback ответ
                console.warn('[OFFLINE][REAL_API] 400 error not handled, creating fallback response');
                const fallbackResponse = {
                  balance: {
                    amount: 1000000000,
                    currency: 'USD'
                  },
                  round: null
                };
                if (requestUrl.includes('/wallet/play')) {
                  let betAmount = 1000000;
                  try {
                    if (options.body) {
                      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
                      const bodyObj = typeof options.body === 'string' ? JSON.parse(bodyStr) : options.body;
                      if (bodyObj && bodyObj.amount !== undefined) {
                        betAmount = Number(bodyObj.amount);
                      }
                    }
                  } catch (e) {}
                  
                  fallbackResponse.round = {
                    betID: Date.now(),
                    amount: betAmount,
                    payout: 0,
                    payoutMultiplier: 0,
                    active: true,
                    state: [{ data: '', type: 'default' }],
                    mode: 'base',
                    event: null
                  };
                }
                return new Response(JSON.stringify(fallbackResponse), {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  }
                });
              }
              
              // На этом этапе все основные ветки уже вернули нормализованный ответ или fallback.
              // Если мы дошли сюда, значит ответ не был обработан выше.
              // Возвращаем оригинальный response (тело не было прочитано, так как мы использовали клоны)
              // НО: если это ошибка (4xx, 5xx), создаем fallback ответ, чтобы игра не падала
              if (response.status >= 400) {
                console.warn('[OFFLINE][REAL_API] Unhandled error status:', response.status, 'for URL:', requestUrl);
                // Создаем fallback ответ для любых необработанных ошибок
                const fallbackResponse = {
                  balance: {
                    amount: 1000000000,
                    currency: 'USD'
                  },
                  round: null
                };
                if (requestUrl.includes('/wallet/play')) {
                  let betAmount = 1000000;
                  try {
                    if (options.body) {
                      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
                      const bodyObj = typeof options.body === 'string' ? JSON.parse(bodyStr) : options.body;
                      if (bodyObj && bodyObj.amount !== undefined) {
                        betAmount = Number(bodyObj.amount);
                      }
                    }
                  } catch (e) {}
                  
                  fallbackResponse.round = {
                    betID: Date.now(),
                    amount: betAmount,
                    payout: 0,
                    payoutMultiplier: 0,
                    active: true,
                    state: [{ data: '', type: 'default' }],
                    mode: 'base',
                    event: null
                  };
                }
                return new Response(JSON.stringify(fallbackResponse), {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  }
                });
              }
              
              // Для успешных ответов возвращаем оригинальный response
              // (тело не было прочитано, так как мы использовали клоны для логирования и нормализации)
              return response;
            })
            .catch(error => {
              console.error('[OFFLINE][REAL_API] Request failed:', error);
              
              // Для /wallet/authenticate при ошибке возвращаем успешный ответ с балансом
              if (requestUrl.includes('/wallet/authenticate')) {
                console.log('[OFFLINE][REAL_API] Authenticate request failed, returning success response with local balance');
                
                // Получаем баланс из localStorage
                let balance = 1000000000; // Дефолт 1000$
                try {
                  const storedBalance = Number(localStorage.getItem('OFFLINE_BALANCE'));
                  if (isFinite(storedBalance) && storedBalance > 0) {
                    balance = storedBalance;
                  } else {
                    let currencyFactor = 1000000;
                    try {
                      const cf = Number(localStorage.getItem('OFFLINE_CURRENCY_FACTOR'));
                      if (isFinite(cf) && cf > 0) currencyFactor = cf;
                    } catch (_) {}
                    let defaultStart = 1000;
                    try {
                      const s = Number(localStorage.getItem('OFFLINE_START_BALANCE'));
                      if (isFinite(s) && s > 0) defaultStart = s;
                    } catch (_) {}
                    balance = Math.round(defaultStart * currencyFactor);
                  }
                } catch (e) {}
                
                // Возвращаем успешный ответ (структура как в реальном API)
                const successResponse = {
                  balance: {
                    amount: balance,
                    currency: 'USD'
                  },
                  round: null,
                  config: {
                    gameID: '',
                    minBet: 100000,
                    maxBet: 1000000000,
                    stepBet: 10000,
                    defaultBetLevel: 1000000,
                    betLevels: [100000, 200000, 400000, 600000, 800000, 1000000, 1200000, 1400000, 1600000, 1800000, 2000000, 3000000, 4000000, 5000000, 6000000, 7000000, 8000000, 9000000, 10000000, 12000000, 14000000, 16000000, 18000000, 20000000, 30000000, 40000000, 50000000, 75000000, 100000000, 150000000, 200000000, 250000000, 300000000, 350000000, 400000000, 450000000, 500000000, 750000000, 1000000000],
                    betModes: {},
                    jurisdiction: {
                      socialCasino: false,
                      disabledFullscreen: false,
                      disabledTurbo: false,
                      disabledSuperTurbo: false,
                      disabledAutoplay: false,
                      disabledSlamstop: false,
                      disabledSpacebar: false,
                      disabledBuyFeature: false,
                      displayNetPosition: false,
                      displayRTP: false,
                      displaySessionTimer: false,
                      minimumRoundDuration: 0
                    }
                  }
                };
                
                return new Response(JSON.stringify(successResponse), {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  }
                });
              } else if (requestUrl.includes('/wallet/play')) {
                console.log('[OFFLINE][REAL_API] Wallet/play request failed, returning success response with normalized data');
                
                // Получаем баланс из localStorage
                let balance = 1000000000;
                try {
                  const storedBalance = Number(localStorage.getItem('OFFLINE_BALANCE'));
                  if (isFinite(storedBalance) && storedBalance > 0) {
                    balance = storedBalance;
                  } else {
                    let currencyFactor = 1000000;
                    try {
                      const cf = Number(localStorage.getItem('OFFLINE_CURRENCY_FACTOR'));
                      if (isFinite(cf) && cf > 0) currencyFactor = cf;
                    } catch (_) {}
                    let defaultStart = 1000;
                    try {
                      const s = Number(localStorage.getItem('OFFLINE_START_BALANCE'));
                      if (isFinite(s) && s > 0) defaultStart = s;
                    } catch (_) {}
                    balance = Math.round(defaultStart * currencyFactor);
                  }
                } catch (e) {}
                
                // Извлекаем amount из запроса
                let betAmount = 1000000;
                try {
                  if (options.body) {
                    const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
                    const bodyObj = typeof options.body === 'string' ? JSON.parse(bodyStr) : options.body;
                    if (bodyObj && bodyObj.amount !== undefined) {
                      betAmount = Number(bodyObj.amount);
                    }
                  }
                } catch (e) {}
                
                // Используем RTP систему для генерации множителя
                let multiplier = 0;
                try {
                  if (__rtp_enabled && __rtp_enabled()) {
                    const tier = __rtp_getTier();
                    const target = __rtp_getTarget();
                    let outcomes = __rtp_outcomes_for_tier(tier);
                    outcomes = __rtp_calibrate(outcomes, target);
                    const pick = __rtp_pickOutcome(outcomes);
                    if (pick && isFinite(pick.mult) && pick.mult >= 0) {
                      multiplier = pick.mult;
                    }
                  }
                } catch (e) {
                  console.warn('[OFFLINE][REAL_API] RTP error, using default multiplier 0:', e);
                }
                
                const payout = Math.round(betAmount * multiplier);
                
                // Возвращаем успешный ответ (структура как в реальном API)
                const successResponse = {
                  balance: {
                    amount: balance - betAmount,
                    currency: 'USD'
                  },
                  round: {
                    betID: Date.now(),
                    amount: betAmount,
                    payout: payout,
                    payoutMultiplier: multiplier,
                    active: true, // Реальный API возвращает true
                    state: [{
                      data: '',
                      type: 'default'
                    }],
                    mode: 'base',
                    event: null
                  }
                };
                
                return new Response(JSON.stringify(successResponse), {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  }
                });
              }
              
              // Для других запросов возвращаем ошибку
              throw error;
            });
        }
      } catch (error) {
        console.error('[OFFLINE][REAL_API] Proxy setup error:', error);
        // При ошибке настройки прокси - продолжаем с обычной логикой моков
      }
    }
    
    // Если это запрос к API, который нужно замокать
    if (typeof url === 'string' && apiMocks) {
      const mock = apiMocks.find(m => {
        if (m.method !== (options.method || 'GET')) return false;
        
        // Безопасная проверка URL
        try {
          // Получаем базовый URL для относительных путей
          const baseUrl = location.origin || 'http://localhost:8080';
          
          // Если url уже полный URL, используем его как есть
          let requestUrl;
          if (url.startsWith('http://') || url.startsWith('https://')) {
            requestUrl = new URL(url);
          } else {
            // Если это относительный URL, добавляем origin
            requestUrl = new URL(url, baseUrl);
          }
          
          // Аналогично для mock URL
          let mockUrl;
          if (m.url.startsWith('http://') || m.url.startsWith('https://')) {
            mockUrl = new URL(m.url);
          } else {
            mockUrl = new URL(m.url, baseUrl);
          }
          
          const matches = requestUrl.pathname === mockUrl.pathname || 
                 requestUrl.href.includes(mockUrl.pathname) ||
                 url.includes(mockUrl.pathname);
          
          if (matches) {
            console.log('[OFFLINE] Found matching mock:', m.url, '->', m.file);
          }
          
          return matches;
        } catch (e) {
          console.warn('[OFFLINE] URL parsing error:', e, 'for url:', url, 'mock url:', m.url);
          // Fallback - простое сравнение строк
          const fallbackMatch = url.includes(m.pathname) || 
                               m.url.includes(url) || 
                               url.includes('/session/start') ||
                               m.url.includes('/session/start');
          
          if (fallbackMatch) {
            console.log('[OFFLINE] Fallback match found:', m.url, '->', m.file);
          }
          
          return fallbackMatch;
        }
      });
      
      if (mock) {
        console.log('[OFFLINE] Mocking API request:', url, '->', mock.file);
        
        // Специальная логика для wallet/play - выбор мока в зависимости от mode в запросе
        let mockFile = mock.file;
        if (mock.pathname === '/wallet/play') {
          // Пытаемся определить mode из тела запроса
          let requestMode = 'base'; // По умолчанию
          // Сначала проверяем принудительную анимацию через URL/localStorage
          try {
            const usp = new URLSearchParams(location.search || '');
            const forced = (usp.get('forceWin') || localStorage.getItem('OFFLINE_FORCE_WIN') || '').toLowerCase().trim();
            if (forced) {
              const candidate = 'mocks/api/wallet_play_win_' + forced + '.json';
              console.log('[OFFLINE] forceWin detected ->', forced, 'file:', candidate);
              mockFile = candidate;
              // Пропускаем дальнейший выбор
              const fetchPath = (mockFile.startsWith('/') ? mockFile : (BASE + mockFile));
              return fetch(fetchPath + ('?t=' + Date.now()), { cache: 'no-store' })
                .then(r => r.json())
                .then(mockData => {
                  const mockResponse = mockData.response || mockData;
                  const headers = new Headers();
                  if (mockResponse.headers) {
                    Object.entries(mockResponse.headers).forEach(([key, value]) => headers.set(key, value));
                  }
                  headers.set('Content-Type', 'application/json');
                  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
                  headers.set('Pragma', 'no-cache');
                  headers.set('Expires', '0');
                  const body = JSON.stringify(mockResponse);
                  return new Response(body, { status: mockResponse.status || 200, statusText: mockResponse.statusText || 'OK', headers });
                })
                .catch(e => {
                  console.warn('[OFFLINE] forceWin fetch failed, fallback to mode logic:', e);
                  // если не удалось — продолжаем стандартную логику ниже
                });
            }
          } catch (e) { console.warn('[OFFLINE] forceWin read error:', e); }
          
          try {
            // Получаем body из options
            const requestBody = options.body;
            if (requestBody) {
              let parsedBody = null;
              
              // Если body - это строка, пытаемся распарсить
              if (typeof requestBody === 'string') {
                try {
                  parsedBody = JSON.parse(requestBody);
                } catch (e) {
                  // Если не JSON, пытаемся найти mode напрямую в строке
                  const modeMatch = requestBody.match(/"mode"\s*:\s*"([^"]+)"/) || 
                                   requestBody.match(/'mode'\s*:\s*'([^']+)'/);
                  if (modeMatch && modeMatch[1]) {
                    requestMode = modeMatch[1];
                    console.log('[OFFLINE] Detected mode from string body:', requestMode);
                  }
                  // Пытаемся вытащить amount напрямую из строки
                  const amountMatch = requestBody.match(/\bamount\b\s*:\s*(\d+)/);
                  if (amountMatch && amountMatch[1]) {
                    const num = Number(amountMatch[1]);
                    if (isFinite(num)) {
                      __offlineRequestedBet = num;
                      try { localStorage.setItem('OFFLINE_LAST_BET', String(num)); } catch (_) {}
                    }
                  }
                }
              } else if (typeof requestBody === 'object' && requestBody !== null) {
                // Если это объект (но не null, Blob, FormData), используем напрямую
                if (!(requestBody instanceof Blob) && !(requestBody instanceof FormData)) {
                  parsedBody = requestBody;
                }
              }
              
              // Проверяем поле mode в распарсенном объекте
              if (parsedBody && typeof parsedBody === 'object' && parsedBody.mode) {
                requestMode = parsedBody.mode;
                console.log('[OFFLINE] Detected mode from request body:', requestMode);
              }
              // Сохраняем последний режим для расчёта дефолтной ставки
              try { localStorage.setItem('OFFLINE_LAST_MODE', String(requestMode)); } catch (_) {}
              // Извлекаем сумму ставки из запроса (если есть)
              if (parsedBody && typeof parsedBody === 'object' && parsedBody.amount != null) {
                const num = Number(parsedBody.amount);
                if (isFinite(num)) {
                  __offlineRequestedBet = num;
                  try { localStorage.setItem('OFFLINE_LAST_BET', String(num)); } catch (_) {}
                  // Получаем currencyFactor для конвертации
                  let cf = 1000000;
                  try {
                    const cfRaw = localStorage.getItem('OFFLINE_CURRENCY_FACTOR');
                    if (cfRaw) cf = Number(cfRaw);
                  } catch (_) {}
                  console.log(`[OFFLINE] Extracted amount from request for mode ${requestMode}:`, num, 'units =', num / cf, '$');
                }
              } else if ((requestMode === 'chaos' || requestMode === 'ante')) {
                // Для бонусных режимов логируем, если amount не найден в запросе
                console.log(`[OFFLINE] Warning: No amount found in request body for ${requestMode} mode. Body keys:`, parsedBody ? Object.keys(parsedBody).join(', ') : 'null');
              }
            }
          } catch (e) {
            console.warn('[OFFLINE] Failed to parse request body for mode:', e);
          }
          
          // Выбираем мок в зависимости от mode с учетом вероятностей
          // Функция для выбора мока по весам (weighted random)
          const selectWeightedMock = (mocks) => {
            const totalWeight = mocks.reduce((sum, mock) => sum + (mock.weight || 1), 0);
            let random = Math.random() * totalWeight;
            for (const mock of mocks) {
              random -= (mock.weight || 1);
              if (random <= 0) {
                return mock.file;
              }
            }
            return mocks[mocks.length - 1].file; // fallback
          };
          
          if (requestMode === 'ante') {
            // ANTE: используем моки из wallet_play_from_mock_ante_*.json
            // weight определяет относительную вероятность выпадения (чем больше, тем чаще)
            const anteMocks = [];
            for (let i = 1; i <= 68; i++) {
              anteMocks.push({ file: `mocks/api/wallet_play_from_mock_ante_${i}.json`, weight: 1 });
            }
            mockFile = selectWeightedMock(anteMocks);
            console.log('[OFFLINE] Using ante mock:', mockFile);
          } else if (requestMode === 'chaos') {
            // CHAOS: используем моки из wallet_play_from_mock_chaos_*.json
            const chaosMocks = [];
            for (let i = 1; i <= 28; i++) {
              chaosMocks.push({ file: `mocks/api/wallet_play_from_mock_chaos_${i}.json`, weight: 1 });
            }
            mockFile = selectWeightedMock(chaosMocks);
            console.log('[OFFLINE] Using chaos mock:', mockFile);
          } else {
            // BASE: используем моки из wallet_play_from_mock_base_*.json и старые wallet_play_*.json (включая проигрыш)
            // Проигрыш (wallet_play_2.json) имеет вес 12 для вероятности ~40% (12/(12+47) = 20.3%)
            const baseMocks = [];
            for (let i = 1; i <= 47; i++) {
              baseMocks.push({ file: `mocks/api/wallet_play_from_mock_base_${i}.json`, weight: 1 });
            }
            // Старые моки, включая проигрыш (wallet_play_2.json - проигрыш, payout отсутствует)
            baseMocks.push({ file: 'mocks/api/wallet_play_2.json', weight: 12 }); // ПРОИГРЫШ
            mockFile = selectWeightedMock(baseMocks);
            console.log('[OFFLINE] Using base mock:', mockFile);
          }
        }
        
        // Определяем правильный путь для мок-файла
        let fetchPath;
        if (mockFile.startsWith('/')) {
          fetchPath = mockFile; // Absolute path from root
        } else {
          fetchPath = BASE + mockFile; // Relative to BASE
        }
        
        return fetch(fetchPath + ('?t=' + Date.now()), { cache: 'no-store' })
          .then(response => response.json())
          .then(mockData => {
            // Создаем Response с правильными заголовками
            const mockResponse = mockData.response || mockData;
            const headers = new Headers();
            
            // Добавляем заголовки из мока
            if (mockResponse.headers) {
              Object.entries(mockResponse.headers).forEach(([key, value]) => {
                headers.set(key, value);
              });
            }
            
            // Устанавливаем Content-Type и заголовки для предотвращения кеширования
            headers.set('Content-Type', 'application/json');
            headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            headers.set('Pragma', 'no-cache');
            headers.set('Expires', '0');
            
            // Декодируем body если он в base64, или используем body напрямую
            let body;
            if (mockResponse.body) {
              // Если body уже есть как объект, сериализуем его
              // ВАЖНО: При сериализации JSON.stringify автоматически корректно обрабатывает base64 строки
              // в поле data, поэтому не нужно их специально обрабатывать
              if (typeof mockResponse.body === 'string') {
                body = mockResponse.body;
              } else {
                // Сериализуем объект в JSON строку
                // JSON.stringify корректно обрабатывает base64 строки без экранирования
                body = JSON.stringify(mockResponse.body);
              }
            } else if (mockResponse.bodyB64) {
              // Декодируем base64
              body = atob(mockResponse.bodyB64);
            } else {
              // Используем весь mockResponse как body
              body = JSON.stringify(mockResponse);
            }
            
            // Проверяем валидность JSON и динамически пересчитываем баланс
            try {
              const parsed = JSON.parse(body);
              console.log('[OFFLINE] Parsed response structure - has balance:', !!parsed?.balance, 'balance amount:', parsed?.balance?.amount);
              // Быстрая валидация base64 блока: если битый — подменим на безопасный base раунд
              try {
                const maybe = parsed?.round?.state?.[0]?.data;
                if (typeof maybe === 'string' && maybe.length > 0) {
                  // Пробуем atob; если бросит — считаем битым
                  atob(maybe);
                }
              } catch (b64e) {
                console.warn('[OFFLINE] Invalid base64 in selected mock, falling back to wallet_play_1.json:', b64e);
                const safePath = BASE + 'mocks/api/wallet_play_1.json?t=' + Date.now();
                return fetch(safePath, { cache: 'no-store' })
                  .then(r => r.json())
                  .then(safeData => {
                    const safe = safeData.response || safeData;
                    const safeBody = JSON.stringify(safe.body ? safe.body : safe);
                    return new Response(safeBody, {
                      status: safe.status || 200,
                      statusText: safe.statusText || 'OK',
                      headers
                    });
                  });
              }
              // Привязка к endpoint и поэтапное обновление баланса:
              // - wallet/play: только списываем ставку (prev - bet), сохраняем payout в кеш
              // - wallet/end-round: только прибавляем payout к сохранённому (stored + lastPayout)
              try {
                let mockPathname = '';
                if (mock && typeof mock.url === 'string') {
                  try { mockPathname = new URL(mock.url, location.origin).pathname; } catch (_) { mockPathname = mock.url; }
                }
                // Проверяем также по исходному URL запроса для надёжности
                const requestPath = typeof url === 'string' ? url : '';
                const isPlay = /\/wallet\/play$/i.test(mockPathname) || (mock?.url || '').includes('/wallet/play') || /\/wallet\/play$/i.test(requestPath);
                const isEndRound = /\/wallet\/end-round$/i.test(mockPathname) || (mock?.url || '').includes('/wallet/end-round') || /\/wallet\/end-round$/i.test(requestPath);
                const isSessionStart = /\/session\/start$/i.test(mockPathname) || (mock?.url || '').includes('/session/start') || /\/session\/start$/i.test(requestPath);

                const storedRaw = localStorage.getItem('OFFLINE_BALANCE');
                const stored = storedRaw !== null ? Number(storedRaw) : null;
                const mockBalance = Number(parsed?.balance?.amount);
                const betFromMock = Number(parsed?.round?.amount);
                if (!isFinite(__offlineRequestedBet)) {
                  try {
                    const lastBetRaw = localStorage.getItem('OFFLINE_LAST_BET');
                    const lastBet = lastBetRaw != null ? Number(lastBetRaw) : NaN;
                    if (isFinite(lastBet)) __offlineRequestedBet = lastBet;
                  } catch (_) {}
                }
                // Определяем last mode для дефолтных ставок
                let lastMode = 'base';
                try {
                  const lm = localStorage.getItem('OFFLINE_LAST_MODE');
                  if (lm) lastMode = lm;
                } catch (_) {}
                // В base-режиме глушим физику, чтобы не было ошибок TriggerEvent
                if (lastMode === 'base' && parsed && parsed.round && parsed.round.active === true) {
                  parsed.round.active = false;
                  body = JSON.stringify(parsed);
                }
                // Масштаб валюты (по умолчанию 1$ = 1_000_000 единиц)
                let currencyFactor = 1000000;
                try {
                  const cf = Number(localStorage.getItem('OFFLINE_CURRENCY_FACTOR'));
                  if (isFinite(cf) && cf > 0) currencyFactor = cf;
                } catch (_) {}

                // Глобальная защита: если это не play/end-round/session-start, но в ответе есть balance —
                // всегда подменяем его на локальный сохранённый (или стартовый). Это убирает 997 на старте.
                if (!isPlay && !isEndRound && !isSessionStart && parsed && parsed.balance && typeof parsed.balance === 'object') {
                  let defaultStart = 1000;
                  try {
                    const startRaw = localStorage.getItem('OFFLINE_START_BALANCE');
                    if (startRaw != null) {
                      const startNum = Number(startRaw);
                      if (isFinite(startNum)) defaultStart = startNum;
                    }
                  } catch (_) {}
                  const storedRaw2 = localStorage.getItem('OFFLINE_BALANCE');
                  const stored2 = storedRaw2 !== null ? Number(storedRaw2) : NaN;
                  const effective = isFinite(stored2) && stored2 > 0 ? stored2 : Math.round(defaultStart * currencyFactor);
                  parsed.balance.amount = effective;
                  body = JSON.stringify(parsed);
                }

                // UI ставка в единицах бекенда (нормализация применится позже, когда известен режим)
                let uiBetUnits = isFinite(__offlineUiBet) ? Math.round(__offlineUiBet * currencyFactor) : NaN;
                // Режим-зависимая нормализация ставки: минимум и шаг читаются из localStorage, дефолт 0.01$
                const normalizeBetUnits = (valUnits, mode) => {
                  if (!isFinite(valUnits) || valUnits <= 0) return NaN;
                  const modeKey = String(mode || 'base').toUpperCase();
                  let stepUsd = 0.01;
                  let minUsd = 0.01;
                  try {
                    const lsStep = Number(localStorage.getItem('OFFLINE_BET_STEP_' + modeKey));
                    if (isFinite(lsStep) && lsStep > 0) stepUsd = lsStep;
                  } catch (_) {}
                  try {
                    const lsMin = Number(localStorage.getItem('OFFLINE_MIN_BET_' + modeKey));
                    if (isFinite(lsMin) && lsMin > 0) minUsd = lsMin;
                  } catch (_) {}
                  const stepUnits = Math.max(1, Math.round(stepUsd * currencyFactor));
                  const minUnits = Math.max(1, Math.round(minUsd * currencyFactor));
                  const before = Math.round(valUnits);
                  let v = Math.max(minUnits, before);
                  v = Math.round(v / stepUnits) * stepUnits; // округляем к ближайшему шагу
                  try {
                    const toUsd = (u) => (isFinite(u) ? (u / currencyFactor).toFixed(2) : 'NaN');
                    console.log(`[OFFLINE][STEP] mode=${modeKey} in(units)=${before} in($)=$${toUsd(before)} step=$${stepUsd} min=$${minUsd} stepUnits=${stepUnits} minUnits=${minUnits} -> out(units)=${v} out($)=$${toUsd(v)}`);
                  } catch(_) {}
                  return v;
                };

                // Правила подбора ставки:
                // chaos/ante: amount из запроса > цена бонуса из UI/игровых объектов > расчет на основе базовой ставки > fallback
                // base: amount > UI > cache > mock > 1$ * factor
                let bet = NaN;
                if (isEndRound) {
                  // На end-round не пересчитываем ставку, используем последнюю из кэша
                  try {
                    const cached = Number(localStorage.getItem('OFFLINE_LAST_BET'));
                    if (isFinite(cached)) bet = cached;
                  } catch (_) {}
                } else if (lastMode === 'chaos' || lastMode === 'ante') {
                  // В бонусных режимах: пытаемся понять, это покупка бонуса (цена из UI) или обычная ставка
                  let useBonusPrice = false;
                  try { useBonusPrice = String(localStorage.getItem('OFFLINE_USE_BONUS_PRICE') || '').trim() === '1'; } catch (_) {}
                  const detectedBonusPrice = __offlineGetBonusPrice(lastMode);
                  const bonusPriceUnits = isFinite(detectedBonusPrice) ? Math.round(detectedBonusPrice * currencyFactor) : NaN;
                  console.log(`[OFFLINE] ${lastMode} bonus price search result: bonusPrice=`, detectedBonusPrice, ', bonusPriceUnits=', bonusPriceUnits, ', __offlineRequestedBet=', __offlineRequestedBet);
                  
                  // Получаем последнюю базовую ставку (для расчета множителя)
                  let lastBaseBet = NaN;
                  try {
                    // Ищем последнюю ставку из base режима (не бонусного)
                    const storedBetRaw = localStorage.getItem('OFFLINE_LAST_BASE_BET');
                    if (storedBetRaw) {
                      const storedBet = Number(storedBetRaw);
                      if (isFinite(storedBet) && storedBet > 0) {
                        lastBaseBet = storedBet;
                      }
                    }
                    // Если не нашли, используем текущую UI ставку
                    if (!isFinite(lastBaseBet) && isFinite(uiBetUnits)) {
                      lastBaseBet = uiBetUnits;
                    }
                    // Если и это не сработало, используем последнюю ставку из запроса (если была)
                    if (!isFinite(lastBaseBet)) {
                      const lastBetRaw = localStorage.getItem('OFFLINE_LAST_BET');
                      if (lastBetRaw) {
                        const lastBet = Number(lastBetRaw);
                        if (isFinite(lastBet) && lastBet > 0) {
                          lastBaseBet = lastBet;
                        }
                      }
                    }
                  } catch (_) {}
                  
                  // Множители для бонусов (относительно базовой ставки)
                  // Разделены для хаоса, базы и ант; можно переопределить через localStorage
                  let anteMult = 1;
                  let chaosMult = 0.1; // раньше было 100; по умолчанию уменьшаем, чтобы ставка 100 не давала множитель 100
                  try {
                    const lsAnte = Number(localStorage.getItem('OFFLINE_MULTIPLIER_ANTE'));
                    if (isFinite(lsAnte) && lsAnte > 0) anteMult = lsAnte;
                  } catch (_) {}
                  try {
                    const lsChaos = Number(localStorage.getItem('OFFLINE_MULTIPLIER_CHAOS'));
                    if (isFinite(lsChaos) && lsChaos > 0) chaosMult = lsChaos;
                  } catch (_) {}
                  const bonusMultipliers = {
                    'ante': anteMult,
                    'chaos': chaosMult,
                    'base': 1
                  };
                  const multiplier = bonusMultipliers[lastMode] || 1;
                  
                  // Упрощённая логика для chaos/ante: без авто-детектов, только явные правила
                  // Приоритет: 1) явная покупка бонуса (OFFLINE_USE_BONUS_PRICE=1), 2) request amount, 3) UI bet, 4) last base bet, 5) fallback 0.01$
                  let betSource = 'fallback0.01$';
                  
                  if (useBonusPrice && isFinite(bonusPriceUnits)) {
                    // Явная покупка бонуса через флаг
                    bet = bonusPriceUnits;
                    betSource = 'forcedBonusPriceUI';
                  } else if (isFinite(__offlineRequestedBet)) {
                    // Используем amount из запроса (нормализуем)
                    bet = normalizeBetUnits(__offlineRequestedBet, lastMode);
                    betSource = 'requestAmount';
                  } else if (isFinite(uiBetUnits)) {
                    // Используем ставку из UI (нормализуем)
                    bet = normalizeBetUnits(uiBetUnits, lastMode);
                    betSource = 'uiBet';
                  } else if (isFinite(lastBaseBet) && lastBaseBet > 0) {
                    // Используем последнюю базовую ставку (нормализуем)
                    bet = normalizeBetUnits(lastBaseBet, lastMode);
                    betSource = 'lastBaseBet';
                  } else {
                    // Fallback: минимальная ставка для режима
                    bet = normalizeBetUnits(Math.round(0.01 * currencyFactor), lastMode);
                  }
                  
                  if (!isEndRound) {
                    try {
                      const toUsd = (v) => (isFinite(v) ? (v / currencyFactor).toFixed(2) : 'NaN');
                      console.log(`[OFFLINE][BET] mode=${lastMode} source=${betSource} req=$${toUsd(__offlineRequestedBet)} ui=$${toUsd(uiBetUnits)} bonusUI=$${toUsd(bonusPriceUnits)} useBonusPrice=${useBonusPrice} -> bet=$${toUsd(bet)}`);
                    } catch(_) {}
                  }
                } else {
                  // BASE режим - сохраняем ставку для расчета бонусов
                  if (isFinite(__offlineRequestedBet)) {
                    bet = normalizeBetUnits(__offlineRequestedBet, 'BASE');
                    try { localStorage.setItem('OFFLINE_LAST_BASE_BET', String(bet)); } catch (_) {}
                  } else if (isFinite(uiBetUnits)) {
                    bet = normalizeBetUnits(uiBetUnits, 'BASE');
                    try { localStorage.setItem('OFFLINE_LAST_BASE_BET', String(bet)); } catch (_) {}
                  } else if (isFinite(betFromMock)) {
                    bet = normalizeBetUnits(betFromMock, 'BASE');
                    try { localStorage.setItem('OFFLINE_LAST_BASE_BET', String(bet)); } catch (_) {}
                  } else {
                    bet = normalizeBetUnits(Math.round(0.01 * currencyFactor), 'BASE');
                    try { localStorage.setItem('OFFLINE_LAST_BASE_BET', String(bet)); } catch (_) {}
                  }
                }
                try { localStorage.setItem('OFFLINE_LAST_BET', String(bet)); } catch (_) {}
                // Динамический перерасчёт выигрыша от ставки: игнорируем жёстко зашитые суммы из моков
                let payout;
                try {
                  const payoutField = parsed?.round?.payout;
                  const multField = Number(parsed?.round?.payoutMultiplier);
                  const mockAmount = Number(parsed?.round?.amount);
                  // Выбираем актуальную ставку для расчёта: приоритет — вычисленная bet
                  const effectiveBet = isFinite(bet) ? bet : (isFinite(mockAmount) ? mockAmount : NaN);
                  // Определяем множитель: ПРИОРИТЕТ 1) RTP система (если включена); 2) из мока; 3) сохранённый; 4) дефолт
                  let effectiveMultiplier = NaN;
                  let multiplierSource = 'default';
                  let usedRtpDistribution = false;
                  
                  // ПРИОРИТЕТ 1: RTP система (если включена) - должна применяться ПЕРВОЙ
                  try {
                    if (__rtp_enabled()) {
                      const tier = __rtp_getTier();
                      const target = __rtp_getTarget();
                      let outcomes = __rtp_outcomes_for_tier(tier);
                      outcomes = __rtp_calibrate(outcomes, target);
                      const pick = __rtp_pickOutcome(outcomes);
                      if (pick && isFinite(pick.mult) && pick.mult >= 0) {
                        effectiveMultiplier = pick.mult;
                        multiplierSource = 'rtpDistribution_tier' + tier;
                        usedRtpDistribution = true;
                      }
                    }
                  } catch (e) {
                    console.warn('[OFFLINE][RTP] Error in RTP distribution:', e);
                  }
                  
                  // FALLBACK 2: Множитель из мока (только если RTP система не использовалась)
                  if (!usedRtpDistribution) {
                    if (isFinite(multField) && multField > 0) {
                      effectiveMultiplier = multField;
                      multiplierSource = 'mockMultiplier';
                    } else {
                      const payoutFromMock = Number(payoutField);
                      if (isFinite(payoutFromMock) && isFinite(mockAmount) && mockAmount > 0) {
                        effectiveMultiplier = payoutFromMock / mockAmount;
                        multiplierSource = 'derivedFromMockPayout';
                      }
                    }
                  }
                  // FALLBACK 3: Сохранённый множитель (только если RTP и моки не использовались)
                  if (!usedRtpDistribution && (!isFinite(effectiveMultiplier) || effectiveMultiplier < 0)) {
                    // Пробуем взять сохранённый множитель для текущего режима
                    try {
                      const saved = Number(localStorage.getItem('OFFLINE_LAST_MULTIPLIER_' + String(lastMode || 'base').toUpperCase()));
                      if (isFinite(saved) && saved >= 0) {
                        effectiveMultiplier = saved;
                        multiplierSource = 'savedMultiplier';
                      }
                    } catch (_) {}
                  }
                  // FALLBACK 4: Дефолтный множитель (только если ничего не найдено, но НЕ если RTP система вернула 0)
                  // Важно: effectiveMultiplier === 0 - это валидный проигрыш, не нужно его заменять!
                  if (!isFinite(effectiveMultiplier) || (effectiveMultiplier < 0 && !usedRtpDistribution)) {
                    // Позволяем переопределить дефолт, но учитываем RTP
                    // Если RTP система активна, но не вернула значение - это ошибка, используем консервативный дефолт
                    let defaultMult = usedRtpDistribution ? 0 : 0.96; // Если RTP включен, но не сработал - консервативный RTP
                    try {
                      const override = Number(localStorage.getItem('OFFLINE_DEFAULT_MULTIPLIER'));
                      if (isFinite(override) && override >= 0) defaultMult = override;
                    } catch (_) {}
                    effectiveMultiplier = defaultMult;
                    if (!usedRtpDistribution) {
                      multiplierSource = 'defaultFallback';
                    }
                  }
                  // Разрешаем только явный override множителя (НО только если RTP система не используется)
                  // Это позволяет тестировать конкретные множители, но не переопределяет RTP распределение
                  if (!usedRtpDistribution) {
                    try {
                      const modeKey = String(lastMode || 'base').toUpperCase();
                      const override = Number(localStorage.getItem('OFFLINE_PAYOUT_MULT_' + modeKey));
                      if (isFinite(override) && override >= 0) {
                        effectiveMultiplier = override;
                        multiplierSource = 'overrideByMode';
                      }
                    } catch (_) {}
                  }
                  
                  // Вычисляем payout: учитываем, что множитель 0 - это валидный проигрыш
                  if (isFinite(effectiveBet)) {
                    // Множитель 0 означает проигрыш (payout = 0)
                    payout = Math.round(effectiveBet * Math.max(0, effectiveMultiplier));
                    // Принудительно обновляем поля ответа, чтобы UI видел корректные значения
                    if (parsed && parsed.round && typeof parsed.round === 'object') {
                      parsed.round.amount = effectiveBet;
                      parsed.round.payoutMultiplier = effectiveMultiplier;
                      parsed.round.payout = payout;
                      // Синхронизируем типичные алиасы выигрыша, если они присутствуют в структуре
                      const aliasKeys = ['win', 'winnings', 'totalWin', 'total_winnings', 'prize', 'sumWin'];
                      for (const k of aliasKeys) {
                        if (k in parsed.round && typeof parsed.round[k] === 'number') {
                          parsed.round[k] = payout;
                        }
                      }
                    }
                    // Сохраняем использованный множитель для текущего режима (только если НЕ используется RTP)
                    // RTP система генерирует случайные множители каждый раз, не нужно их сохранять
                    if (!usedRtpDistribution) {
                      try { localStorage.setItem('OFFLINE_LAST_MULTIPLIER_' + String(lastMode || 'base').toUpperCase(), String(effectiveMultiplier)); } catch (_) {}
                    }
                    try {
                      const betUsd = (effectiveBet / currencyFactor).toFixed(2);
                      const payoutUsd = (payout / currencyFactor).toFixed(2);
                      console.log('[OFFLINE][PAYOUT] bet(units)=', effectiveBet, 'bet($)=', betUsd, 'mult=', effectiveMultiplier, '(' + multiplierSource + ')', '=> payout(units)=', payout, 'payout($)=', payoutUsd);
                    } catch(_) {}
                  } else {
                    payout = Number(payoutField);
                  }
                } catch(_) {
                  // fallback к прежней логике при любой ошибке
                  const payoutField = parsed?.round?.payout;
                  const mult = Number(parsed?.round?.payoutMultiplier);
                  payout = (typeof payoutField === 'number' && isFinite(payoutField)) ? payoutField : (isFinite(bet) && isFinite(mult) ? Math.round(bet * mult) : NaN);
                }

                if (isSessionStart) {
                  // Жёстко инициализируем локальный баланс при старте сессии
                  console.log('[OFFLINE] Intercepted session/start, setting balance');
                  let defaultStart = 1000;
                  try {
                    const startRaw = localStorage.getItem('OFFLINE_START_BALANCE');
                    if (startRaw != null) {
                      const startNum = Number(startRaw);
                      if (isFinite(startNum)) defaultStart = startNum;
                    }
                  } catch (_) {}
                  const startBalanceUnits = Math.round(defaultStart * currencyFactor);
                  console.log('[OFFLINE] Setting start balance to:', defaultStart, '$ =', startBalanceUnits, 'units');
                  if (parsed && parsed.balance && typeof parsed.balance === 'object') {
                    parsed.balance.amount = startBalanceUnits;
                    body = JSON.stringify(parsed);
                    console.log('[OFFLINE] Balance in response updated to:', startBalanceUnits);
                  }
                  try { localStorage.setItem('OFFLINE_BALANCE', String(startBalanceUnits)); } catch (_) {}
                  console.log('[OFFLINE] Balance saved to localStorage:', startBalanceUnits);
                } else if (isPlay) {
                  // Инициализация баланса при первом раунде
                  let defaultStart = 1000;
                  try {
                    const startRaw = localStorage.getItem('OFFLINE_START_BALANCE');
                    if (startRaw != null) {
                      const startNum = Number(startRaw);
                      if (isFinite(startNum)) defaultStart = startNum;
                    }
                  } catch (_) {}
                  // Базовый баланс: из локального хранилища, иначе фиксированный старт (в единицах бекенда)
                  // ВАЖНО: Если баланс не установлен или равен нулю - принудительно ставим дефолтный
                  let base;
                  if (isFinite(stored) && stored > 0) {
                    base = stored;
                  } else {
                    // Первый запуск или баланс не установлен - ставим дефолтный старт
                    base = Math.round(defaultStart * currencyFactor);
                    console.log('[OFFLINE] First wallet/play detected, initializing balance to:', defaultStart, '$ =', base, 'units');
                    try { localStorage.setItem('OFFLINE_BALANCE', String(base)); } catch (_) {}
                  }
                  // ВАЖНО: всегда используем локальный баланс, игнорируем mockBalance из мока
                  let next = base;
                  // Списываем ставку, если известна
                  if (isFinite(bet)) {
                    try {
                      const toUsd = (v) => (isFinite(v) ? (v / currencyFactor).toFixed(2) : 'NaN');
                      console.log('[OFFLINE][BALANCE] before(units)=', base, 'before($)=', toUsd(base), 'bet(units)=', bet, 'bet($)=', toUsd(bet));
                    } catch(_) {}
                    // Для chaos mode при покупке бонуски умножаем ставку на 100
                    // Для ante mode при покупке бонуски умножаем ставку на 5
                    let actualBet = bet;
                    let isBonusPurchase = false;
                    let bonusMultiplier = 1;
                    
                    if ((lastMode === 'chaos' || lastMode === 'ante') && !isEndRound) {
                      // Проверяем, что это покупка бонуски: проверяем и флаг, и сравнение ставки с ценой бонуса
                      let useBonusPrice = false;
                      try { useBonusPrice = String(localStorage.getItem('OFFLINE_USE_BONUS_PRICE') || '').trim() === '1'; } catch (_) {}
                      
                      // Определяем покупку бонуса: либо через флаг, либо если ставка меньше цены бонуса (т.к. при покупке бонуса запрашивается минимальная ставка)
                      if (useBonusPrice) {
                        isBonusPurchase = true;
                      } else {
                        try {
                          const detectedBonusPrice = __offlineGetBonusPrice(lastMode);
                          const bonusPriceUnits = isFinite(detectedBonusPrice) ? Math.round(detectedBonusPrice * currencyFactor) : NaN;
                          // Если ставка меньше цены бонуса, значит это покупка бонуса (запрашивается минимальная ставка, но списывается цена бонуса)
                          if (isFinite(bonusPriceUnits) && bet < bonusPriceUnits) {
                            isBonusPurchase = true;
                          }
                        } catch(_) {}
                      }
                      
                      // Определяем множитель для списания: chaos = 100, ante = 5
                      if (isBonusPurchase) {
                        bonusMultiplier = lastMode === 'chaos' ? 100 : 5;
                      }
                      
                      try {
                        const toUsd = (v) => (isFinite(v) ? (v / currencyFactor).toFixed(2) : 'NaN');
                        const detectedBonusPrice = __offlineGetBonusPrice(lastMode);
                        const bonusPriceUnits = isFinite(detectedBonusPrice) ? Math.round(detectedBonusPrice * currencyFactor) : NaN;
                        console.log('[OFFLINE][BALANCE] ' + lastMode + ' mode check: isBonusPurchase=', isBonusPurchase, 'useBonusPrice=', useBonusPrice, 'bet=$' + toUsd(bet) + ', bonusPriceUnits=$' + toUsd(bonusPriceUnits) + ', bonusMultiplier=' + bonusMultiplier);
                      } catch(_) {}
                    }
                    // Умножаем списание: chaos mode на 100, ante mode на 5
                    let deduction = actualBet;
                    if ((lastMode === 'chaos' || lastMode === 'ante') && !isEndRound && isBonusPurchase) {
                      deduction = actualBet * bonusMultiplier;
                    }
                    try {
                      const toUsd = (v) => (isFinite(v) ? (v / currencyFactor).toFixed(2) : 'NaN');
                      console.log('[OFFLINE][BALANCE] Deduction calculation: isBonusPurchase=', isBonusPurchase, 'actualBet=$' + toUsd(actualBet) + ', deduction=$' + toUsd(deduction));
                    } catch(_) {}
                    next = Math.max(0, base - deduction);
                    try { localStorage.setItem('OFFLINE_BALANCE', String(next)); } catch (_) {}
                    try {
                      const toUsd = (v) => (isFinite(v) ? (v / currencyFactor).toFixed(2) : 'NaN');
                      console.log('[OFFLINE][BALANCE] after(units)=', next, 'after($)=', toUsd(next));
                    } catch(_) {}
                  } else {
                    // Без ставки сохраняем текущий локальный баланс (если его ещё нет)
                    if (!isFinite(stored) || stored <= 0) {
                      try { localStorage.setItem('OFFLINE_BALANCE', String(base)); } catch (_) {}
                    }
                  }
                  // Всегда перезаписываем balance в ответе на локальный баланс (защита от моков с другим балансом)
                  if (parsed && parsed.balance && typeof parsed.balance === 'object') {
                    parsed.balance.amount = next;
                    body = JSON.stringify(parsed);
                  }
                  // Кешируем возможный payout для прибавления на end-round (только если payout > 0, т.е. выигрыш)
                  if (isFinite(payout) && payout > 0) {
                    try { localStorage.setItem('OFFLINE_LAST_PAYOUT', String(payout)); } catch (_) {}
                  } else {
                    // При поражении очищаем кеш payout
                    try { localStorage.removeItem('OFFLINE_LAST_PAYOUT'); } catch (_) {}
                  }
                } else if (isEndRound) {
                  // На завершении проверяем payout из ответа - если он есть и > 0, это выигрыш
                  let actualPayout = 0;
                  try {
                    const payoutFromResponse = Number(parsed?.round?.payout);
                    if (isFinite(payoutFromResponse) && payoutFromResponse > 0) {
                      actualPayout = payoutFromResponse;
                    } else {
                      // Проверяем win в metaTags
                      const state = parsed?.round?.state?.[0];
                      if (state?.metaTags && Array.isArray(state.metaTags)) {
                        for (const tag of state.metaTags) {
                          if (tag.name === 'win' && tag.value) {
                            const winValue = Number(tag.value);
                            if (isFinite(winValue) && winValue > 0) {
                              actualPayout = Math.round(winValue * currencyFactor);
                              break;
                            }
                          }
                        }
                      }
                    }
                  } catch(_) {}
                  
                  // Используем payout из ответа, если он есть, иначе из кеша
                  const lastPayoutRaw = localStorage.getItem('OFFLINE_LAST_PAYOUT');
                  const lastPayout = actualPayout > 0 ? actualPayout : (lastPayoutRaw !== null ? Number(lastPayoutRaw) : 0);
                  
                  // Добавляем payout только если он > 0 (т.е. это выигрыш)
                  if (isFinite(stored) && isFinite(lastPayout) && lastPayout > 0) {
                    const finalBalance = Math.max(0, Math.round(stored + lastPayout));
                    if (parsed && parsed.balance && typeof parsed.balance === 'object') {
                      parsed.balance.amount = finalBalance;
                      body = JSON.stringify(parsed);
                    }
                    try { localStorage.setItem('OFFLINE_BALANCE', String(finalBalance)); } catch (_) {}
                    try { localStorage.removeItem('OFFLINE_LAST_PAYOUT'); } catch (_) {}
                    try {
                      const lastPayoutUsd = (lastPayout / currencyFactor).toFixed(2);
                      const finalUsd = (finalBalance / currencyFactor).toFixed(2);
                      console.log('[OFFLINE][END-ROUND] stored(units)=', stored, 'lastPayout(units)=', lastPayout, '=> final(units)=', finalBalance, '| lastPayout($)=', lastPayoutUsd, 'final($)=', finalUsd);
                    } catch(_) {}
                  } else if (isFinite(stored)) {
                    // Нет payout или payout = 0 (поражение) — просто отражаем сохранённый баланс
                    if (parsed && parsed.balance && typeof parsed.balance === 'object') {
                      parsed.balance.amount = stored;
                      body = JSON.stringify(parsed);
                    }
                    try { localStorage.setItem('OFFLINE_BALANCE', String(stored)); } catch (_) {}
                    try { localStorage.removeItem('OFFLINE_LAST_PAYOUT'); } catch (_) {}
                    try {
                      const finalUsd = (stored / currencyFactor).toFixed(2);
                      console.log('[OFFLINE][END-ROUND] No payout (loss), balance=', stored, '($' + finalUsd + ')');
                    } catch(_) {}
                  }
                }
              } catch (e) { console.warn('[OFFLINE] staged balance adjust failed:', e); }
              // Дополнительная защита: (старый общий блок) — больше не нужен, но оставим как fallback
              try {
                // no-op
              } catch (balErr) {
                console.warn('[OFFLINE] Balance adjust skipped:', balErr);
              }
              // Логи для проверки корректности base64 блока
              if (parsed.round?.state?.[0]?.data && typeof parsed.round.state[0].data === 'string') {
                console.log('[OFFLINE] JSON valid; balance adjusted; base64 preserved. Preview:', body.substring(0, 200) + '...');
              } else {
                console.log('[OFFLINE] JSON valid; balance adjusted. Preview:', body.substring(0, 200) + '...');
              }
            } catch (e) {
              console.error('[OFFLINE] Invalid JSON detected:', e);
              console.error('[OFFLINE] Problematic body (first 500 chars):', body.substring(0, 500));
              // Не пытаемся исправлять, так как это может повредить base64 данные
              throw new Error('Invalid JSON in mock response: ' + e.message);
            }
            
            return new Response(body, {
              status: mockResponse.status || 200,
              statusText: mockResponse.statusText || 'OK',
              headers: headers
            });
          })
          .catch(error => {
            console.error('[OFFLINE] Mock fetch error:', error);
            return originalFetch.call(this, url, options);
          });
      }
    }
    
    return originalFetch.call(this, url, options);
  };
  
  // XHR shim (если нужно)
  console.log('[OFFLINE] XHR shim initialized');
})();

// ============================================
// 3. Analytics blocker
// ============================================
(function() {
  const ANALYTICS = [
    /googletagmanager\.com/i,
    /google-analytics\.com/i,
    /adobedtm\.com/i,
  ];
  
  // Сохраняем оригинальный fetch перед перехватом API моков
  // Оборачиваем текущий fetch, чтобы не ломать перехват моков
  setTimeout(() => {
    const previousFetch = window.fetch;
    window.fetch = function(url, ...args) {
      if (typeof url === 'string' && ANALYTICS.some(re => re.test(url))) {
        console.log('[OFFLINE] Blocked analytics:', url);
        return Promise.resolve(new Response('', { status: 204 }));
      }
      return previousFetch.call(this, url, ...args);
    };
  }, 100);
  
  console.log('[OFFLINE] Analytics blocker initialized');
})();

// ============================================
// 4. URL Constructor Protection
// ============================================
(function() {
  const originalURL = window.URL;
  
  // Перехватываем конструктор URL для защиты от невалидных значений
  window.URL = function(url, base) {
    try {
      // Проверяем, что url не undefined, null или пустая строка
      if (url === undefined || url === null || url === '') {
        console.warn('[OFFLINE] Invalid URL constructor called with:', url, 'base:', base);
        // Возвращаем валидный URL по умолчанию
        return new originalURL('http://localhost:8080/', base);
      }
      
      // Если это строка, проверяем, что она не содержит только пробелы
      if (typeof url === 'string' && url.trim() === '') {
        console.warn('[OFFLINE] Empty URL string provided');
        return new originalURL('http://localhost:8080/', base);
      }
      
      return new originalURL(url, base);
    } catch (e) {
      console.warn('[OFFLINE] URL constructor error:', e, 'url:', url, 'base:', base);
      // Fallback - возвращаем валидный URL
      try {
        return new originalURL('http://localhost:8080/', base);
      } catch (fallbackError) {
        console.error('[OFFLINE] Fallback URL creation failed:', fallbackError);
        // Последний fallback
        return new originalURL('http://localhost:8080/');
      }
    }
  };
  
  // Копируем статические свойства
  Object.setPrototypeOf(window.URL, originalURL);
  Object.defineProperty(window.URL, 'prototype', {
    value: originalURL.prototype,
    writable: false
  });
  
  // Также защищаем URLSearchParams
  const originalURLSearchParams = window.URLSearchParams;
  if (originalURLSearchParams) {
    window.URLSearchParams = function(init) {
      try {
        if (init === undefined || init === null) {
          console.warn('[OFFLINE] URLSearchParams called with invalid init:', init);
          return new originalURLSearchParams('');
        }
        return new originalURLSearchParams(init);
      } catch (e) {
        console.warn('[OFFLINE] URLSearchParams constructor error:', e, 'init:', init);
        return new originalURLSearchParams('');
      }
    };
    
    Object.setPrototypeOf(window.URLSearchParams, originalURLSearchParams);
    Object.defineProperty(window.URLSearchParams, 'prototype', {
      value: originalURLSearchParams.prototype,
      writable: false
    });
  }
  
  console.log('[OFFLINE] URL constructor protection initialized');
})();

console.log('[OFFLINE] Runtime initialized successfully');
