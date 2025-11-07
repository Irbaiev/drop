/* 🔧 Enhanced Service Worker - auto-generated */
const CACHE_NAME = 'drop-the-boss-v1';
// GAME_QS теперь генерируется динамически в index.html, поэтому здесь используем шаблон
// Если токен не найден в запросе, будет использован этот fallback
const GAME_QS_FALLBACK = 'access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uIjp7InBsYXllcklkIjoiZGVtbzp0b3BzcGluLXN0d2FsbGV0OjExMzU0MDc3IiwiZ2FtZUlkIjoidHMtdGctcGFwZXJwbGFuZSIsImlzUGxheUZvckZ1biI6dHJ1ZSwiY3VycmVuY3kiOiJVU0QiLCJmb3JjZUNvbmZpZyI6IiIsImlwQWRkcmVzcyI6Ijc4LjQwLjExNi4xMzYiLCJzdWJQYXJ0bmVySUQiOiIiLCJjYWxsQmFja1VSTCI6IiJ9fQ.LOsJIU1o3dul065zHwLrKXI4UPMoVcE1wfmwLwfjBKA&play_for_fun=true&language=en&currency=USD';

// Расширенный список аналитики для блокировки
const ANALYTICS = [
  /googletagmanager\.com/i,
  /google-analytics\.com/i,
  /adobedtm\.com/i,
  /hotjar\.com/i,
  /clarity(ms|cdn)?\.com/i,
  /everestjs\.net/i,
  /assets\.adobedtm\.com/i,
];

// Bootstrap-shim с полными защитами
const inject = `<script>(function(){
  // 0) Гарантируем query-string (токен теперь генерируется динамически в index.html)
  // Если query-string отсутствует, используем fallback
  if (!location.search) {
    // Пытаемся получить токен из localStorage (новый ключ для пользовательского токена)
    let token = '';
    let storedLang = 'en';
    try {
      // Сначала пробуем новый ключ для пользовательского токена
      token = localStorage.getItem('OFFLINE_USER_ACCESS_TOKEN') || 
              localStorage.getItem('OFFLINE_REAL_API_ACCESS_TOKEN') || '';
      storedLang = localStorage.getItem('LAST_LANG') || storedLang;
    } catch(e) {}
    const qs = new URLSearchParams();
    if (token) {
      qs.set('access_token', token);
    } else {
      GAME_QS_FALLBACK.split('&').forEach(pair => {
        const [k,v] = pair.split('=');
        if (k) qs.set(k, v || '');
      });
    }
    if (!qs.has('lang')) {
      qs.set('lang', storedLang);
    }
    if (!qs.has('language')) {
      qs.set('language', qs.get('lang'));
    }
    if (!qs.has('currency')) {
      qs.set('currency', 'USD');
    }
    if (!qs.has('play_for_fun')) {
      qs.set('play_for_fun', 'true');
    }
    history.replaceState(null,'',location.pathname+'?'+qs.toString());
  }
  
  // 0.5) Добавляем sessionID в URL, если он есть в localStorage, но отсутствует в URL
  // ВАЖНО: Используем sessionID из URL в приоритете, localStorage только как fallback
  try {
    const urlParams = new URLSearchParams(location.search);
    const urlSessionID = urlParams.get('sessionID');
    const currentLang = urlParams.get('lang') || urlParams.get('language');
    if (currentLang) {
      urlParams.set('lang', currentLang);
      urlParams.set('language', currentLang);
    } else {
      const storedLang = localStorage.getItem('LAST_LANG');
      if (storedLang) {
        urlParams.set('lang', storedLang);
        urlParams.set('language', storedLang);
      }
    }
    
    if (urlSessionID) {
      // Если sessionID есть в URL, обновляем localStorage (новый sessionID имеет приоритет)
      localStorage.setItem('LAST_SESSION_ID', urlSessionID);
      const rgsUrl = urlParams.get('rgs_url');
      if (rgsUrl) {
        localStorage.setItem('LAST_RGS_URL', rgsUrl);
      }
      const langToSave = urlParams.get('lang') || urlParams.get('language');
      if (langToSave) {
        localStorage.setItem('LAST_LANG', langToSave);
      }
      history.replaceState(null, '', location.pathname + '?' + urlParams.toString());
      console.log('[OFFLINE] ✅ Using sessionID from URL:', urlSessionID.substring(0, 20) + '...');
    } else {
      // Если sessionID нет в URL, пробуем взять из localStorage
      const savedSessionID = localStorage.getItem('LAST_SESSION_ID');
      if (savedSessionID && savedSessionID.trim()) {
        urlParams.set('sessionID', savedSessionID.trim());
        const savedRgsUrl = localStorage.getItem('LAST_RGS_URL');
        if (savedRgsUrl && !urlParams.has('rgs_url')) {
          urlParams.set('rgs_url', savedRgsUrl);
        }
        const storedLang = localStorage.getItem('LAST_LANG');
        if (storedLang) {
          urlParams.set('lang', storedLang);
          urlParams.set('language', storedLang);
        }
        const newSearch = urlParams.toString();
        history.replaceState(null, '', location.pathname + '?' + newSearch);
        console.log('[OFFLINE] ✅ Added sessionID to URL from localStorage:', savedSessionID.substring(0, 20) + '...');
        console.log('[OFFLINE] 🔍 Updated URL:', location.href.substring(0, 150) + '...');
      } else {
        console.warn('[OFFLINE] ⚠️ No sessionID in URL and localStorage. Game may not work correctly.');
      }
    }
  } catch(e) {
    console.warn('[OFFLINE] ❌ Failed to add sessionID to URL:', e);
  }
  
  // 0.6) Слушаем postMessage от родительского окна для получения sessionID и access_token
  console.log('[OFFLINE] 🎧 PostMessage listener установлен в', location.href);
  console.log('[OFFLINE] 🔍 Текущий sessionID в URL:', new URLSearchParams(location.search).get('sessionID') || 'ОТСУТСТВУЕТ');
  window.addEventListener('message', function(event) {
    // Логируем ВСЕ сообщения для отладки (даже без type)
    console.log('[OFFLINE] 📨 Received ANY postMessage:', {
      origin: event.origin,
      source: event.source ? 'window' : 'null',
      data: event.data,
      hasType: !!(event.data && event.data.type)
    });
    
    // Логируем сообщения с type
    if (event.data && event.data.type) {
      console.log('[OFFLINE] 📨 Received postMessage with type:', event.data.type, event.data);
    }
    
    if (event.data && event.data.type === 'SET_SESSION_ID') {
      try {
        const sessionID = event.data.sessionID;
        const rgsUrl = event.data.rgsUrl;
        const accessToken = event.data.accessToken; // Новый access_token
        const force = event.data.force === true; // Флаг принудительного обновления
        
        console.log('[OFFLINE] 🔄 Processing SET_SESSION_ID:', {
          sessionID: sessionID ? sessionID.substring(0, 20) + '...' : 'null',
          rgsUrl: rgsUrl || 'null',
          accessToken: accessToken ? accessToken.substring(0, 50) + '...' : 'null',
          force: force
        });
        
        // Обновляем URL
        const urlParams = new URLSearchParams(location.search);
        const currentSessionID = urlParams.get('sessionID');
        const currentAccessToken = urlParams.get('access_token');
        let needsUpdate = false;
        
        // ВАЖНО: Токен пользователя НЕ должен перезаписываться из postMessage
        // Проверяем, есть ли уже постоянный токен пользователя
        let existingUserToken = null;
        try {
          existingUserToken = localStorage.getItem('OFFLINE_USER_ACCESS_TOKEN');
        } catch(e) {}
        
        // Обновляем access_token в URL только если:
        // 1. Токен передан через postMessage
        // 2. У пользователя еще нет постоянного токена (первый запуск)
        // 3. ИЛИ переданный токен совпадает с постоянным токеном пользователя
        if (accessToken) {
          if (!existingUserToken) {
            // Первый запуск - сохраняем токен как постоянный
            try {
              localStorage.setItem('OFFLINE_USER_ACCESS_TOKEN', accessToken);
              localStorage.setItem('OFFLINE_REAL_API_ACCESS_TOKEN', accessToken);
              console.log('[OFFLINE] 💾 Saved new permanent access_token to localStorage (first time)');
            } catch(e) {
              console.warn('[OFFLINE] ⚠️ Failed to save access_token to localStorage:', e);
            }
          } else if (accessToken === existingUserToken) {
            // Токен совпадает с постоянным - просто обновляем URL
            console.log('[OFFLINE] ℹ️ access_token matches permanent user token, updating URL only');
          } else {
            // Токен отличается от постоянного - НЕ перезаписываем постоянный токен
            console.log('[OFFLINE] ⚠️ Ignoring access_token from postMessage - using permanent user token instead');
            accessToken = existingUserToken; // Используем постоянный токен
          }
          
          // Обновляем URL с правильным токеном
          if (accessToken !== currentAccessToken) {
            urlParams.set('access_token', accessToken);
            needsUpdate = true;
            console.log('[OFFLINE] ✅ Updated access_token in URL:', accessToken.substring(0, 30) + '...');
          } else {
            console.log('[OFFLINE] ℹ️ access_token in URL already correct, skipping update');
          }
        }
        
        // Обновляем sessionID, если он передан
        if (sessionID) {
          // Сохраняем в localStorage
          try {
            localStorage.setItem('LAST_SESSION_ID', sessionID);
            localStorage.setItem('LAST_RGS_URL', rgsUrl || '');
            console.log('[OFFLINE] 💾 Saved sessionID to localStorage:', sessionID.substring(0, 20) + '...');
          } catch(e) {
            console.warn('[OFFLINE] ⚠️ Failed to save sessionID to localStorage:', e);
          }
          
          // Если sessionID отличается или установлен флаг force, обновляем URL
          if (force || !currentSessionID || currentSessionID !== sessionID) {
            urlParams.set('sessionID', sessionID);
            if (rgsUrl) {
              urlParams.set('rgs_url', rgsUrl);
            }
            needsUpdate = true;
            console.log('[OFFLINE] ✅ Received sessionID via postMessage and ' + (force ? 'FORCED update' : 'added to') + ' URL:', {
              old: currentSessionID ? currentSessionID.substring(0, 20) + '...' : 'null',
              new: sessionID.substring(0, 20) + '...'
            });
            
            // ВАЖНО: Если sessionID изменился, ОБЯЗАТЕЛЬНО перезагружаем страницу
            // Это нужно для обновления баланса с новым sessionID
            if (currentSessionID && currentSessionID !== sessionID) {
              console.log('[OFFLINE] 🔄 SessionID changed from', currentSessionID.substring(0, 20) + '...', 'to', sessionID.substring(0, 20) + '...');
              console.log('[OFFLINE] 🔄 Reloading page to update balance with new sessionID...');
              // Сначала обновляем URL, потом перезагружаем
              urlParams.set('sessionID', sessionID);
              if (rgsUrl) {
                urlParams.set('rgs_url', rgsUrl);
              }
              const newSearch = urlParams.toString();
              history.replaceState(null, '', location.pathname + '?' + newSearch);
              console.log('[OFFLINE] ✅ URL updated, reloading in 50ms...');
              setTimeout(() => {
                location.reload();
              }, 50);
              return; // Не продолжаем, так как будет перезагрузка
            }
          } else {
            console.log('[OFFLINE] ℹ️ Received sessionID via postMessage (already in URL, same value):', sessionID.substring(0, 20) + '...');
          }
        }
        
        // Применяем изменения в URL, если были обновления
        if (needsUpdate) {
          const newSearch = urlParams.toString();
          history.replaceState(null, '', location.pathname + '?' + newSearch);
          console.log('[OFFLINE] ✅ URL updated with new sessionID and/or access_token. New URL:', location.href.substring(0, 150) + '...');
        } else {
          console.log('[OFFLINE] ℹ️ No URL update needed');
        }
      } catch(e) {
        console.error('[OFFLINE] ❌ Failed to process SET_SESSION_ID message:', e);
      }
    }
  });

  // 1) Мягкие дефолты
  window.ingenuity = window.ingenuity || {};
  window.ingenuity.soundManager = window.ingenuity.soundManager || {
    _muted:false, setMute:function(v){this._muted=!!v;},
    muteAllSounds:function(){this.setMute(true);},
    unmuteAllSounds:function(){this.setMute(false);},
    unMuteSoundFxSounds:function(){}, setMusicVolume:function(){},
    playSound:function(){/* no-op */}
  };
  window.ingenuity.baseGameModel = window.ingenuity.baseGameModel || {
    randomGameId1:1, randomGameId2:2, stakes:[1,2,5,10],
    lastMusicVal:0, GameroundID:'offline-demo', remainingTime:10,
    balance: 10000.0, currency: 'USD', maxBet: 490.0, minBet: 0.25,
    defaultBets: [1.0, 2.0, 5.0, 10.0], currentState: 'Running'
  };
  
  // 1.5) PIXI null-guard
  if (window.PIXI && window.PIXI.utils) {
    var originalFrom = window.PIXI.utils.from;
    window.PIXI.utils.from = function(source) {
      if (source === null || source === undefined) {
        console.warn('[OFFLINE] PIXI.utils.from called with null/undefined');
        return {};
      }
      return originalFrom.call(this, source);
    };
  }

  // 1.6) GSAP null-guard
  (function () {
    function patchGsap(g) {
      if (!g || g.__nullGuardPatched) return;
      function sanitizeTargets(targets) {
        if (Array.isArray(targets)) {
          targets = targets.filter(Boolean);
          return targets.length ? targets : null;
        }
        return targets == null ? null : targets;
      }
      function wrap(name) {
        const orig = g[name];
        if (typeof orig !== 'function') return;
        g[name] = function (targets) {
          const rest = Array.prototype.slice.call(arguments, 1);
          const safe = sanitizeTargets(targets);
          if (!safe) return g.to({}, { duration: 0 });
          return orig.apply(this, [safe].concat(rest));
        };
      }
      ['to','from','fromTo','set'].forEach(wrap);
      g.__nullGuardPatched = true;
    }
    if (window.gsap) patchGsap(window.gsap);
    try {
      let _gsap = window.gsap || undefined;
      Object.defineProperty(window, 'gsap', {
        configurable: true,
        get() { return _gsap; },
        set(v) { _gsap = v; patchGsap(v); }
      });
    } catch (e) {}
  })();

  // 1.7) String null-guards
  (function() {
    const originalSplit = String.prototype.split;
    String.prototype.split = function(separator, limit) {
      if (this == null) {
        console.warn('[OFFLINE] String.split called on null/undefined');
        return [];
      }
      return originalSplit.call(this, separator, limit);
    };
    
    const safeStringMethods = ['substring', 'substr', 'slice', 'indexOf', 'lastIndexOf'];
    safeStringMethods.forEach(method => {
      const original = String.prototype[method];
      String.prototype[method] = function() {
        if (this == null) {
          console.warn('[OFFLINE] String.' + method + ' called on null/undefined');
          return method === 'indexOf' || method === 'lastIndexOf' ? -1 : '';
        }
        return original.apply(this, arguments);
      };
    });
  })();

  // 2) Анти-рекурсивный гард для controlUi
  function wrapControlUiOnce(){
    try{
      var root = window.ingenuity && (ingenuity.currentGame || ingenuity.baseGameView || ingenuity);
      if(!root) return false;
      var seen=new Set(), stack=[root], host=null;
      while(stack.length){
        var o=stack.pop();
        if(!o||typeof o!=='object'||seen.has(o)) continue;
        seen.add(o);
        if(typeof o.controlUi==='function'){ host=o; break; }
        for(var k in o) try{ if(o[k]&&typeof o[k]==='object') stack.push(o[k]); }catch(_){}
      }
      if(!host) return false;
      var orig = host.controlUi;
      if(orig.__wrapped) return true;
      var busy=false;
      host.controlUi = function(){
        if(busy) return;
        busy=true;
        try{ return orig.apply(this, arguments); }
        finally{ busy=false; }
      };
      host.controlUi.__wrapped = true;
      return true;
    }catch(_){ return false; }
  }
  var tries=0, id=setInterval(function(){
    if (wrapControlUiOnce() || ++tries>120) clearInterval(id);
  }, 100);

  console.log('[OFFLINE] Bootstrap shim initialized');
})();</script>`;

self.addEventListener('install', (e) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[SW] Activating...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(['/runtime/offline.js']);
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Блокируем аналитику
  if (ANALYTICS.some(re => re.test(url.href))) {
    if (e.request.method !== 'GET') {
      return e.respondWith(new Response(null, { status: 204 }));
    }
    if (url.pathname.endsWith('.js')) {
      return e.respondWith(new Response('console.log("[BLOCKED]", "' + url.href + '");', {
        headers: { 'Content-Type': 'application/javascript' }
      }));
    }
    return e.respondWith(new Response(null, { status: 204 }));
  }

  // Инжектируем bootstrap-shim в HTML
  if (e.request.destination === 'document' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (!response.ok) return response;
        // Сохраняем query string из оригинального запроса
        const originalUrl = e.request.url;
        const originalUrlObj = new URL(originalUrl);
        const queryString = originalUrlObj.search;
        
        // Если есть query string в оригинальном запросе, передаем его в инжект-скрипт
        let injectScript = inject;
        if (queryString && queryString.length > 1) {
          // Извлекаем sessionID из query string, если он есть
          const originalParams = new URLSearchParams(queryString.substring(1));
          const sessionID = originalParams.get('sessionID');
          const rgsUrl = originalParams.get('rgs_url');
          
          // Модифицируем инжект-скрипт, чтобы он использовал оригинальный query string
          injectScript = inject.replace(
            'if (!location.search) {',
            `// Восстанавливаем query string из оригинального запроса
            const originalQuery = ${JSON.stringify(queryString.substring(1))};
            if (originalQuery) {
              // Сохраняем sessionID в localStorage, если он есть в оригинальном запросе
              try {
                const originalParams = new URLSearchParams(originalQuery);
                const sessionID = originalParams.get('sessionID');
                const rgsUrl = originalParams.get('rgs_url');
                if (sessionID) {
                  localStorage.setItem('LAST_SESSION_ID', sessionID);
                  if (rgsUrl) {
                    localStorage.setItem('LAST_RGS_URL', rgsUrl);
                  }
                }
              } catch(e) {}
              
              // Восстанавливаем query string в URL
              if (!location.search || location.search.length <= 1) {
                history.replaceState(null, '', location.pathname + '?' + originalQuery);
                // После history.replaceState location.search должен обновиться, но проверим
                const currentSearch = new URL(location.href).search;
                if (!currentSearch || currentSearch.length <= 1) {
                  // Если все еще нет query string, используем setTimeout для повторной попытки
                  setTimeout(function() {
                    if (!location.search || location.search.length <= 1) {
                      history.replaceState(null, '', location.pathname + '?' + originalQuery);
                    }
                  }, 0);
                }
              }
            }
            if (!location.search) {`
          );
        }
        
        return response.text().then(html => {
          const injected = html.replace('</head>', injectScript + '</head>');
          const clonedHeaders = new Headers(response.headers);
          if (queryString) {
            clonedHeaders.set('X-Original-Query', queryString);
          }
          return new Response(injected, { headers: clonedHeaders });
        });
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // API запросы - обработка моков
  // НО: если это внешний API (не наш origin), пропускаем его (offline.js обработает)
  const isExternalApi = url.origin !== location.origin;
  if (!isExternalApi && (url.pathname.includes('/api/') || url.pathname.includes('/frontendService/') || 
      url.pathname.includes('/wallet/') || url.pathname.includes('/session/'))) {
    e.respondWith((async () => {
      try {
        // Определяем базовый путь из URL запроса
        let base = '/';
        const pathMatch = url.pathname.match(/^(.*\/dist\/[^\/]+\/)/);
        if (pathMatch && pathMatch[1]) {
          base = pathMatch[1];
        } else {
          const parts = url.pathname.split('/');
          const mirrorIndex = parts.indexOf('mirror');
          if (mirrorIndex > 0) {
            base = parts.slice(0, mirrorIndex).join('/') + '/';
          }
        }
        
        // Загружаем apiMap.json
        const apiMapResponse = await fetch(base + 'mocks/apiMap.json');
        if (apiMapResponse.ok) {
          const apiMocks = await apiMapResponse.json();
          const method = e.request.method || 'GET';
          
          // Ищем подходящий мок
          const mock = apiMocks.find(m => {
            if (m.method !== method) return false;
            try {
              const mockUrl = new URL(m.url);
              return mockUrl.pathname === url.pathname || url.pathname.includes(mockUrl.pathname);
            } catch {
              return url.pathname.includes(m.pathname);
            }
          });
          
          if (mock) {
            console.log('[SW] API mock hit:', url.pathname, '->', mock.file);
            
            // Для wallet/play выбираем случайный мок (без ротации в SW, просто первый подходящий)
            let mockFile = mock.file;
            
            const mockResponse = await fetch(base + mockFile);
            if (mockResponse.ok) {
              const mockData = await mockResponse.json();
              const response = mockData.response || mockData;
              const headers = new Headers();
              
              if (response.headers) {
                Object.entries(response.headers).forEach(([key, value]) => {
                  headers.set(key, value);
                });
              }
              
              headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
              headers.set('Content-Type', response.contentType || 'application/json');
              headers.set('Access-Control-Allow-Origin', '*');
              
              // Обработка bodyB64 - декодируем и исправляем экранирование
              let body = '';
              if (response.body !== undefined) {
                body = typeof response.body === 'string' 
                  ? response.body 
                  : JSON.stringify(response.body);
              } else if (response.bodyB64) {
                body = atob(response.bodyB64);
                // Исправляем экранирование \u002B -> + (важно для base64 в поле data)
                try {
                  const parsedJson = JSON.parse(body);
                  if (parsedJson && typeof parsedJson === 'object') {
                    const fixEscaping = (obj) => {
                      if (typeof obj === 'string') {
                        return obj.replace(/\\u002B/g, '+');
                      }
                      if (Array.isArray(obj)) {
                        return obj.map(fixEscaping);
                      }
                      if (obj && typeof obj === 'object') {
                        const fixed = {};
                        for (const [key, value] of Object.entries(obj)) {
                          fixed[key] = fixEscaping(value);
                        }
                        return fixed;
                      }
                      return obj;
                    };
                    body = JSON.stringify(fixEscaping(parsedJson));
                    console.log('[SW] Fixed JSON escaping (\\u002B -> +)');
                  }
                } catch (_) {
                  // Если не JSON, исправляем экранирование в строке
                  body = body.replace(/\\u002B/g, '+');
                }
              } else {
                body = JSON.stringify(response);
              }
              
              return new Response(body, {
                status: response.status || 200,
                statusText: response.statusText || 'OK',
                headers: headers
              });
            }
          }
        }
      } catch (err) {
        console.warn('[SW] Mock handling error:', err);
      }
      
      // Fallback - пробуем сеть или возвращаем OK
      try {
        return await fetch(e.request);
      } catch {
        return new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  // Обычные запросы
  // Внешние API запросы пропускаем - их обработает offline.js
  if (isExternalApi) {
    return; // Пропускаем, чтобы offline.js мог обработать
  }
  
  e.respondWith(
    fetch(e.request).then(response => {
      // Логирование отключено для уменьшения засорения консоли
      // console.log('[SW] Network response:', e.request.url, response.status);
      return response;
    }).catch(() => caches.match(e.request))
  );
});
