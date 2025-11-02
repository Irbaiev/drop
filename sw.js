/* 🔧 Enhanced Service Worker - auto-generated */
const CACHE_NAME = 'drop-the-boss-v1';
const GAME_QS = 'access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uIjp7InBsYXllcklkIjoiZGVtbzp0b3BzcGluLXN0d2FsbGV0OjExMzU0MDc3IiwiZ2FtZUlkIjoidHMtdGctcGFwZXJwbGFuZSIsImlzUGxheUZvckZ1biI6dHJ1ZSwiY3VycmVuY3kiOiJVU0QiLCJmb3JjZUNvbmZpZyI6IiIsImlwQWRkcmVzcyI6Ijc4LjQwLjExNi4xMzYiLCJzdWJQYXJ0bmVySUQiOiIiLCJjYWxsQmFja1VSTCI6IiJ9fQ.LOsJIU1o3dul065zHwLrKXI4UPMoVcE1wfmwLwfjBKA&play_for_fun=true&language=en&currency=USD';

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
  // 0) Гарантируем query-string
  if (!location.search) {
    history.replaceState(null,'',location.pathname+'?${GAME_QS}');
  }

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
        return response.text().then(html => {
          const injected = html.replace('</head>', inject + '</head>');
          return new Response(injected, { headers: response.headers });
        });
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // API запросы - обработка моков
  if (url.pathname.includes('/api/') || url.pathname.includes('/frontendService/') || 
      url.pathname.includes('/wallet/') || url.pathname.includes('/session/')) {
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
  e.respondWith(
    fetch(e.request).then(response => {
      console.log('[SW] Network response:', e.request.url, response.status);
      return response;
    }).catch(() => caches.match(e.request))
  );
});
