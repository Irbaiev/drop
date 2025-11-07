/* 🔍 Network Request Analyzer - для анализа запросов stake.com */

(function() {
  'use strict';
  
  const LOG_PREFIX = '[NETWORK-ANALYZER]';
  const SESSION_KEYWORDS = ['session', 'game', 'stake-engine', 'rgs', 'casino'];
  const capturedRequests = [];
  const MAX_CAPTURED = 100;
  
  // Сохраняем оригинальные функции
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  // Функция для проверки, связан ли запрос с сессией
  function isSessionRelated(url, method, headers, body) {
    const urlLower = url.toLowerCase();
    const methodLower = method.toLowerCase();
    
    // Проверяем URL
    if (SESSION_KEYWORDS.some(kw => urlLower.includes(kw))) {
      return true;
    }
    
    // Проверяем заголовки
    if (headers) {
      const headerStr = JSON.stringify(headers).toLowerCase();
      if (SESSION_KEYWORDS.some(kw => headerStr.includes(kw))) {
        return true;
      }
    }
    
    // Проверяем тело запроса
    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      if (SESSION_KEYWORDS.some(kw => bodyStr.toLowerCase().includes(kw))) {
        return true;
      }
    }
    
    return false;
  }
  
  // Функция для логирования запроса
  function logRequest(details) {
    const isImportant = isSessionRelated(
      details.url, 
      details.method, 
      details.headers, 
      details.body
    );
    
    const logLevel = isImportant ? '🔴 IMPORTANT' : '🔵';
    console.group(`${LOG_PREFIX} ${logLevel} ${details.method} ${details.url}`);
    console.log('Method:', details.method);
    console.log('URL:', details.url);
    console.log('Headers:', details.headers);
    if (details.body) {
      console.log('Body:', details.body);
    }
    if (details.response) {
      console.log('Response Status:', details.response.status);
      console.log('Response Headers:', details.response.headers);
      console.log('Response Body:', details.response.body);
    }
    if (details.error) {
      console.error('Error:', details.error);
    }
    console.groupEnd();
    
    // Сохраняем важные запросы
    if (isImportant && capturedRequests.length < MAX_CAPTURED) {
      capturedRequests.push({
        ...details,
        timestamp: new Date().toISOString()
      });
      
      // Сохраняем в localStorage для последующего анализа
      try {
        localStorage.setItem('NETWORK_ANALYZER_CAPTURED', JSON.stringify(capturedRequests));
      } catch (e) {
        console.warn(LOG_PREFIX, 'Failed to save to localStorage:', e);
      }
    }
  }
  
  // Перехватываем fetch
  window.fetch = function(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init.method || 'GET').toUpperCase();
    const headers = init.headers || {};
    
    // Преобразуем Headers объект в обычный объект
    let headersObj = {};
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        headersObj[key] = value;
      });
    } else if (typeof headers === 'object') {
      headersObj = headers;
    }
    
    // Пытаемся получить тело запроса
    let body = null;
    if (init.body) {
      if (typeof init.body === 'string') {
        try {
          body = JSON.parse(init.body);
        } catch {
          body = init.body;
        }
      } else {
        body = init.body;
      }
    }
    
    const requestDetails = {
      method,
      url,
      headers: headersObj,
      body
    };
    
    // Выполняем запрос
    return originalFetch.apply(this, arguments)
      .then(response => {
        // Клонируем response для чтения тела
        const clonedResponse = response.clone();
        
        // Пытаемся прочитать тело ответа
        clonedResponse.text().then(text => {
          let responseBody = text;
          try {
            responseBody = JSON.parse(text);
          } catch {
            // Оставляем как строку
          }
          
          const responseHeaders = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });
          
          logRequest({
            ...requestDetails,
            response: {
              status: response.status,
              statusText: response.statusText,
              headers: responseHeaders,
              body: responseBody
            }
          });
        }).catch(err => {
          logRequest({
            ...requestDetails,
            response: {
              status: response.status,
              statusText: response.statusText,
              headers: {},
              body: null
            },
            error: err.message
          });
        });
        
        return response;
      })
      .catch(error => {
        logRequest({
          ...requestDetails,
          error: error.message
        });
        throw error;
      });
  };
  
  // Перехватываем XMLHttpRequest
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    this._analyzerMethod = method;
    this._analyzerUrl = url;
    this._analyzerHeaders = {};
    
    return originalXHROpen.call(this, method, url, async, user, password);
  };
  
  // Перехватываем setRequestHeader для XHR
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    if (!this._analyzerHeaders) {
      this._analyzerHeaders = {};
    }
    this._analyzerHeaders[header] = value;
    return originalSetRequestHeader.call(this, header, value);
  };
  
  XMLHttpRequest.prototype.send = function(body) {
    const method = this._analyzerMethod || 'GET';
    const url = this._analyzerUrl || '';
    const headers = this._analyzerHeaders || {};
    
    let requestBody = null;
    if (body) {
      try {
        requestBody = JSON.parse(body);
      } catch {
        requestBody = body;
      }
    }
    
    const requestDetails = {
      method,
      url,
      headers,
      body: requestBody
    };
    
    // Перехватываем события для получения ответа
    const originalOnReadyStateChange = this.onreadystatechange;
    this.onreadystatechange = function() {
      if (this.readyState === 4) {
        let responseBody = null;
        try {
          const text = this.responseText || this.response;
          responseBody = JSON.parse(text);
        } catch {
          responseBody = this.responseText || this.response || null;
        }
        
        const responseHeaders = {};
        const headerString = this.getAllResponseHeaders();
        if (headerString) {
          headerString.split('\r\n').forEach(line => {
            const parts = line.split(': ');
            if (parts.length === 2) {
              responseHeaders[parts[0]] = parts[1];
            }
          });
        }
        
        logRequest({
          ...requestDetails,
          response: {
            status: this.status,
            statusText: this.statusText,
            headers: responseHeaders,
            body: responseBody
          }
        });
      }
      
      if (originalOnReadyStateChange) {
        return originalOnReadyStateChange.apply(this, arguments);
      }
    };
    
    return originalXHRSend.call(this, body);
  };
  
  // Функция для получения всех захваченных запросов
  window.getCapturedRequests = function() {
    try {
      const saved = localStorage.getItem('NETWORK_ANALYZER_CAPTURED');
      return saved ? JSON.parse(saved) : capturedRequests;
    } catch {
      return capturedRequests;
    }
  };
  
  // Функция для очистки захваченных запросов
  window.clearCapturedRequests = function() {
    capturedRequests.length = 0;
    try {
      localStorage.removeItem('NETWORK_ANALYZER_CAPTURED');
    } catch {}
    console.log(LOG_PREFIX, 'Captured requests cleared');
  };
  
  // Функция для экспорта запросов
  window.exportCapturedRequests = function() {
    const requests = window.getCapturedRequests();
    const dataStr = JSON.stringify(requests, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `network-requests-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    console.log(LOG_PREFIX, `Exported ${requests.length} requests`);
  };
  
  console.log(LOG_PREFIX, '✅ Network analyzer initialized');
  console.log(LOG_PREFIX, '📋 Available commands:');
  console.log(LOG_PREFIX, '  - getCapturedRequests() - получить все захваченные запросы');
  console.log(LOG_PREFIX, '  - clearCapturedRequests() - очистить захваченные запросы');
  console.log(LOG_PREFIX, '  - exportCapturedRequests() - экспортировать запросы в JSON файл');
  
})();

