/* 🔧 Enhanced Offline Runtime - auto-generated */

// ============================================
// 1. WebSocket Shim с улучшенной логикой
// ============================================
(function() {
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
  
  fetch(BASE + 'mocks/apiMap.json')
    .then(r => r.json())
    .then(mocks => {
      apiMocks = Array.isArray(mocks) ? mocks : [];
      console.log('[OFFLINE] Loaded', apiMocks.length, 'API mocks');
    })
    .catch(e => console.warn('[OFFLINE] Failed to load API mocks:', e));
  
  // Перехват fetch для API моков
  const originalFetch = window.fetch;
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
  window.fetch = function(url, options = {}) {
    console.log('[OFFLINE] Fetch request:', url, 'method:', options.method || 'GET');
    // Общая переменная для извлечённой суммы ставки из тела запроса
    let __offlineRequestedBet = NaN;
    // Попытка получить ставку из UI
    let __offlineUiBet = __offlineGetUiBet();
    
    // Ранний перехват session/start - ДО поиска моков
    if (typeof url === 'string' && (url.includes('/session/start') || url.endsWith('/session/start'))) {
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
                }
              }
            }
          } catch (e) {
            console.warn('[OFFLINE] Failed to parse request body for mode:', e);
          }
          
          // Выбираем мок в зависимости от mode из новых файлов mock.txt
          if (requestMode === 'ante') {
            // Ante: 13 файлов от wallet_play_from_mock_ante_1.json до wallet_play_from_mock_ante_13.json
            const anteFiles = [];
            for (let i = 1; i <= 13; i++) {
              anteFiles.push('mocks/api/wallet_play_from_mock_ante_' + i + '.json');
            }
            mockFile = anteFiles[Math.floor(Math.random() * anteFiles.length)];
            console.log('[OFFLINE] Using ante mock:', mockFile);
          } else if (requestMode === 'chaos') {
            // Chaos: 14 файлов от wallet_play_from_mock_chaos_1.json до wallet_play_from_mock_chaos_14.json
            const chaosFiles = [];
            for (let i = 1; i <= 14; i++) {
              chaosFiles.push('mocks/api/wallet_play_from_mock_chaos_' + i + '.json');
            }
            mockFile = chaosFiles[Math.floor(Math.random() * chaosFiles.length)];
            console.log('[OFFLINE] Using chaos mock:', mockFile);
          } else {
            // Base: 15 файлов от wallet_play_from_mock_base_1.json до wallet_play_from_mock_base_15.json
            const baseFiles = [];
            for (let i = 1; i <= 15; i++) {
              baseFiles.push('mocks/api/wallet_play_from_mock_base_' + i + '.json');
            }
            mockFile = baseFiles[Math.floor(Math.random() * baseFiles.length)];
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

                // UI ставка в единицах бекенда
                let uiBetUnits = isFinite(__offlineUiBet) ? Math.round(__offlineUiBet * currencyFactor) : NaN;

                // Правила подбора ставки:
                // chaos: 100$ принудительно (если UI не найден) → 100 * factor
                // ante: 5$ принудительно (если UI не найден) → 5 * factor
                // base: body > UI > cache > mock > 1$ * factor
                let bet = NaN;
                if (lastMode === 'chaos') {
                  bet = isFinite(uiBetUnits) ? uiBetUnits : 100 * currencyFactor;
                } else if (lastMode === 'ante') {
                  bet = isFinite(uiBetUnits) ? uiBetUnits : 5 * currencyFactor;
                } else {
                  if (isFinite(__offlineRequestedBet)) {
                    bet = __offlineRequestedBet; // уже в единицах бекенда
                  } else if (isFinite(uiBetUnits)) {
                    bet = uiBetUnits;
                  } else if (isFinite(betFromMock)) {
                    bet = betFromMock;
                  } else {
                    bet = 1 * currencyFactor;
                  }
                }
                try { localStorage.setItem('OFFLINE_LAST_BET', String(bet)); } catch (_) {}
                const payoutField = parsed?.round?.payout;
                const mult = Number(parsed?.round?.payoutMultiplier);
                const payout = typeof payoutField === 'number' && isFinite(payoutField)
                  ? payoutField
                  : (isFinite(bet) && isFinite(mult) ? Math.round(bet * mult) : NaN);

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
                    next = Math.max(0, base - bet);
                    try { localStorage.setItem('OFFLINE_BALANCE', String(next)); } catch (_) {}
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
                  // Кешируем возможный payout для прибавления на end-round
                  if (isFinite(payout)) {
                    try { localStorage.setItem('OFFLINE_LAST_PAYOUT', String(payout)); } catch (_) {}
                  }
                } else if (isEndRound) {
                  // На завершении прибавляем только payout из кеша
                  const lastPayoutRaw = localStorage.getItem('OFFLINE_LAST_PAYOUT');
                  const lastPayout = lastPayoutRaw !== null ? Number(lastPayoutRaw) : null;
                  if (isFinite(stored) && isFinite(lastPayout)) {
                    const finalBalance = Math.max(0, Math.round(stored + lastPayout));
                    if (parsed && parsed.balance && typeof parsed.balance === 'object') {
                      parsed.balance.amount = finalBalance;
                      body = JSON.stringify(parsed);
                    }
                    try { localStorage.setItem('OFFLINE_BALANCE', String(finalBalance)); } catch (_) {}
                    try { localStorage.removeItem('OFFLINE_LAST_PAYOUT'); } catch (_) {}
                  } else if (isFinite(stored)) {
                    // Нет payout — просто отражаем сохранённый баланс
                    if (parsed && parsed.balance && typeof parsed.balance === 'object') {
                      parsed.balance.amount = stored;
                      body = JSON.stringify(parsed);
                    }
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
