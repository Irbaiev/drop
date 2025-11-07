/* 🔍 Скрипт для извлечения деталей API запроса StartThirdPartyDemoSession */

// Выполните эту команду в консоли после активации анализатора и обновления страницы

(function() {
  const requests = getCapturedRequests();
  
  // Ищем запрос StartThirdPartyDemoSession
  const sessionRequest = requests.find(r => 
    r.body && 
    (r.body.query && r.body.query.includes('StartThirdPartyDemoSession') ||
     r.url && r.url.includes('graphql'))
  );
  
  if (!sessionRequest) {
    console.log('❌ Запрос StartThirdPartyDemoSession не найден');
    console.log('📋 Доступные запросы:', requests.map(r => ({
      url: r.url,
      method: r.method,
      operation: r.body?.query?.match(/mutation\s+(\w+)|query\s+(\w+)/)?.[1] || r.body?.query?.match(/x-operation-name['"]:\s*['"]([^'"]+)/)?.[1]
    })));
    return;
  }
  
  console.log('✅ Найден запрос StartThirdPartyDemoSession!');
  console.log('='.repeat(80));
  
  // Извлекаем детали запроса
  const details = {
    url: sessionRequest.url,
    method: sessionRequest.method,
    headers: sessionRequest.headers,
    body: sessionRequest.body,
    response: sessionRequest.response
  };
  
  console.log('\n📤 ЗАПРОС:');
  console.log('URL:', details.url);
  console.log('Method:', details.method);
  console.log('\n📋 Headers:');
  console.log(JSON.stringify(details.headers, null, 2));
  console.log('\n📦 Body:');
  console.log(JSON.stringify(details.body, null, 2));
  
  // Парсим GraphQL запрос
  if (details.body && details.body.query) {
    console.log('\n🔍 GraphQL Query:');
    console.log(details.body.query);
    
    // Извлекаем переменные
    if (details.body.variables) {
      console.log('\n📝 Variables:');
      console.log(JSON.stringify(details.body.variables, null, 2));
    }
  }
  
  console.log('\n📥 RESPONSE:');
  if (details.response) {
    console.log('Status:', details.response.status);
    console.log('\nResponse Body:');
    console.log(JSON.stringify(details.response.body, null, 2));
    
    // Пытаемся найти sessionID в ответе
    const responseStr = JSON.stringify(details.response.body);
    if (responseStr.includes('sessionID') || responseStr.includes('sessionId') || responseStr.includes('session')) {
      console.log('\n🎯 ВНИМАНИЕ: В ответе найдены упоминания session!');
      
      // Пытаемся извлечь sessionID
      const sessionMatch = responseStr.match(/["']sessionID["']\s*:\s*["']([^"']+)["']/i) ||
                          responseStr.match(/["']sessionId["']\s*:\s*["']([^"']+)["']/i) ||
                          responseStr.match(/sessionID["']?\s*[:=]\s*["']([^"']+)["']/i);
      
      if (sessionMatch) {
        console.log('✅ Найден sessionID:', sessionMatch[1]);
      }
      
      // Пытаемся найти config с sessionID
      if (details.response.body && details.response.body.data) {
        const config = details.response.body.data.startThirdPartyDemoSession?.config;
        if (config) {
          console.log('\n📋 Config из ответа:');
          console.log(config);
          
          // Если config - это строка, пытаемся распарсить
          if (typeof config === 'string') {
            try {
              const parsed = JSON.parse(config);
              console.log('\n📦 Parsed Config:');
              console.log(JSON.stringify(parsed, null, 2));
              
              // Ищем sessionID в распарсенном config
              const configStr = JSON.stringify(parsed);
              const configSessionMatch = configStr.match(/["']sessionID["']\s*:\s*["']([^"']+)["']/i);
              if (configSessionMatch) {
                console.log('\n🎯 SessionID в config:', configSessionMatch[1]);
              }
            } catch (e) {
              console.log('⚠️ Config не является валидным JSON');
            }
          }
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 Следующие шаги:');
  console.log('1. Скопируйте URL, метод, headers и body запроса');
  console.log('2. Скопируйте формат ответа');
  console.log('3. Используйте эту информацию для создания функции получения sessionID');
  
  // Сохраняем детали в глобальную переменную для удобства
  window.SESSION_API_DETAILS = details;
  console.log('\n✅ Детали сохранены в window.SESSION_API_DETAILS');
  console.log('Выполните: JSON.stringify(window.SESSION_API_DETAILS, null, 2) для экспорта');
  
})();

