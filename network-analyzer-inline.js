/* 🔍 Network Analyzer - Компактная версия для вставки в консоль stake.com */
/* Скопируйте весь код ниже и вставьте в консоль браузера на странице stake.com */

(function() {
  'use strict';
  const LOG = '[NET-ANALYZER]';
  const KEYWORDS = ['session', 'game', 'stake-engine', 'rgs', 'casino'];
  const captured = [];
  const MAX = 100;
  
  const origFetch = window.fetch;
  const origXHROpen = XMLHttpRequest.prototype.open;
  const origXHRSend = XMLHttpRequest.prototype.send;
  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  
  function isImportant(url, method, headers, body) {
    const str = (url + ' ' + method + ' ' + JSON.stringify(headers || {}) + ' ' + JSON.stringify(body || '')).toLowerCase();
    return KEYWORDS.some(k => str.includes(k));
  }
  
  function log(details) {
    const imp = isImportant(details.url, details.method, details.headers, details.body);
    const icon = imp ? '🔴' : '🔵';
    console.group(`${LOG} ${icon} ${details.method} ${details.url}`);
    console.log('Method:', details.method, '| URL:', details.url);
    if (details.headers) console.log('Headers:', details.headers);
    if (details.body) console.log('Body:', details.body);
    if (details.response) {
      console.log('Response:', details.response.status, details.response.body);
    }
    if (details.error) console.error('Error:', details.error);
    console.groupEnd();
    
    if (imp && captured.length < MAX) {
      captured.push({...details, ts: new Date().toISOString()});
      try {
        localStorage.setItem('NET_ANALYZER', JSON.stringify(captured));
      } catch(e) {}
    }
  }
  
  window.fetch = function(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init.method || 'GET').toUpperCase();
    let headers = {};
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => headers[k] = v);
    } else if (init.headers) {
      headers = init.headers;
    }
    let body = null;
    if (init.body) {
      try { body = JSON.parse(init.body); } catch { body = init.body; }
    }
    const req = {method, url, headers, body};
    return origFetch.apply(this, arguments).then(r => {
      r.clone().text().then(t => {
        let respBody = t;
        try { respBody = JSON.parse(t); } catch {}
        const respHeaders = {};
        r.headers.forEach((v, k) => respHeaders[k] = v);
        log({...req, response: {status: r.status, headers: respHeaders, body: respBody}});
      }).catch(e => log({...req, error: e.message}));
      return r;
    }).catch(e => { log({...req, error: e.message}); throw e; });
  };
  
  XMLHttpRequest.prototype.open = function(method, url) {
    this._aMethod = method;
    this._aUrl = url;
    this._aHeaders = {};
    return origXHROpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    if (!this._aHeaders) this._aHeaders = {};
    this._aHeaders[header] = value;
    return origSetHeader.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.send = function(body) {
    const method = this._aMethod || 'GET';
    const url = this._aUrl || '';
    const headers = this._aHeaders || {};
    let reqBody = null;
    if (body) {
      try { reqBody = JSON.parse(body); } catch { reqBody = body; }
    }
    const req = {method, url, headers, body: reqBody};
    const origOnReady = this.onreadystatechange;
    this.onreadystatechange = function() {
      if (this.readyState === 4) {
        let respBody = null;
        try {
          const txt = this.responseText || this.response;
          respBody = JSON.parse(txt);
        } catch {
          respBody = this.responseText || this.response;
        }
        const respHeaders = {};
        const hdrStr = this.getAllResponseHeaders();
        if (hdrStr) {
          hdrStr.split('\r\n').forEach(l => {
            const p = l.split(': ');
            if (p.length === 2) respHeaders[p[0]] = p[1];
          });
        }
        log({...req, response: {status: this.status, headers: respHeaders, body: respBody}});
      }
      if (origOnReady) return origOnReady.apply(this, arguments);
    };
    return origXHRSend.call(this, body);
  };
  
  window.getCapturedRequests = () => {
    try {
      const s = localStorage.getItem('NET_ANALYZER');
      return s ? JSON.parse(s) : captured;
    } catch {
      return captured;
    }
  };
  
  window.clearCapturedRequests = () => {
    captured.length = 0;
    try { localStorage.removeItem('NET_ANALYZER'); } catch {}
    console.log(LOG, '✅ Очищено');
  };
  
  window.exportCapturedRequests = () => {
    const reqs = window.getCapturedRequests();
    const data = JSON.stringify(reqs, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-requests-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log(LOG, `✅ Экспортировано ${reqs.length} запросов`);
  };
  
  console.log(LOG, '✅ Анализатор активирован!');
  console.log(LOG, '📋 Команды: getCapturedRequests(), exportCapturedRequests(), clearCapturedRequests()');
  console.log(LOG, '🔄 Обновите страницу для начала захвата запросов');
})();

