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
                  // Определяем множитель: 1) из мока; 2) по отношению payout/mockAmount; 3) сохранённый для режима; 4) дефолт/override
                  let effectiveMultiplier = NaN;
                  let multiplierSource = 'default';
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
                  // Если включено управление RTP/волатильностью — используем собственное распределение множителей
                  let usedRtpDistribution = false;
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
                  } catch (_) {}
                  if (!usedRtpDistribution && (!isFinite(effectiveMultiplier) || effectiveMultiplier <= 0)) {
                    // Пробуем взять сохранённый множитель для текущего режима
                    try {
                      const saved = Number(localStorage.getItem('OFFLINE_LAST_MULTIPLIER_' + String(lastMode || 'base').toUpperCase()));
                      if (isFinite(saved) && saved > 0) {
                        effectiveMultiplier = saved;
                        multiplierSource = 'savedMultiplier';
                      }
                    } catch (_) {}
                  }
                  if (!isFinite(effectiveMultiplier) || effectiveMultiplier <= 0) {
                    // Позволяем переопределить дефолт
                    let defaultMult = 5.0;
                    try {
                      const override = Number(localStorage.getItem('OFFLINE_DEFAULT_MULTIPLIER'));
                      if (isFinite(override) && override > 0) defaultMult = override;
                    } catch (_) {}
                    effectiveMultiplier = defaultMult;
                  }
                  // Разрешаем только явный override множителя, без клампа
                  try {
                    const modeKey = String(lastMode || 'base').toUpperCase();
                    const override = Number(localStorage.getItem('OFFLINE_PAYOUT_MULT_' + modeKey));
                    if (isFinite(override) && override > 0) {
                      effectiveMultiplier = override;
                      multiplierSource = 'overrideByMode';
                    }
                  } catch (_) {}
                  if (isFinite(effectiveBet)) {
                    payout = Math.round(effectiveBet * effectiveMultiplier);
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
                    // Сохраняем использованный множитель для текущего режима
                    try { localStorage.setItem('OFFLINE_LAST_MULTIPLIER_' + String(lastMode || 'base').toUpperCase(), String(effectiveMultiplier)); } catch (_) {}
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
