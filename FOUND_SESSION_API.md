# 🎯 Найден API для получения sessionID!

## ✅ Обнаружен важный запрос

Анализатор обнаружил GraphQL mutation `StartThirdPartyDemoSession` - это именно тот запрос, который создает новую демо-сессию для игры!

## 📋 Как извлечь детали API

### Шаг 1: Выполните команду в консоли

После того, как анализатор активирован и страница обновлена, выполните в консоли:

```javascript
// Скопируйте и вставьте код из файла extract-session-api.js
```

Или выполните эту команду напрямую:

```javascript
const requests = getCapturedRequests();
const sessionRequest = requests.find(r => 
  r.body && r.body.query && r.body.query.includes('StartThirdPartyDemoSession')
);

if (sessionRequest) {
  console.log('✅ Найден запрос!');
  console.log('URL:', sessionRequest.url);
  console.log('Method:', sessionRequest.method);
  console.log('Headers:', sessionRequest.headers);
  console.log('Body:', sessionRequest.body);
  console.log('Response:', sessionRequest.response);
  
  // Сохраняем для экспорта
  window.SESSION_API_DETAILS = {
    url: sessionRequest.url,
    method: sessionRequest.method,
    headers: sessionRequest.headers,
    body: sessionRequest.body,
    response: sessionRequest.response
  };
  
  console.log('\n✅ Детали сохранены в window.SESSION_API_DETAILS');
  console.log('Экспорт: JSON.stringify(window.SESSION_API_DETAILS, null, 2)');
}
```

### Шаг 2: Экспортируйте детали

```javascript
// Экспортировать в JSON
const details = window.SESSION_API_DETAILS;
const json = JSON.stringify(details, null, 2);
console.log(json);

// Или скопировать в буфер обмена
copy(json);
```

## 🔍 Что искать в ответе

В ответе от `StartThirdPartyDemoSession` должна быть информация о сессии. Обычно это:

1. **Поле `config`** - может содержать sessionID или URL с sessionID
2. **Прямое поле `sessionID`** в ответе
3. **URL iframe** с параметрами sessionID

### Пример ожидаемого ответа:

```json
{
  "data": {
    "startThirdPartyDemoSession": {
      "config": "{\"sessionID\":\"xxx-xxx-xxx\",\"rgs_url\":\"rgs.stake-engine.com\",...}"
    }
  }
}
```

Или:

```json
{
  "data": {
    "startThirdPartyDemoSession": {
      "sessionID": "xxx-xxx-xxx",
      "rgs_url": "rgs.stake-engine.com",
      "currency": "USD"
    }
  }
}
```

## 🚀 Следующие шаги

После извлечения деталей API:

1. **Создайте функцию для получения sessionID:**
   ```javascript
   async function getNewSessionID(gameSlug) {
     const response = await fetch('/_api/graphql', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-language': 'ru',
         'x-operation-name': 'StartThirdPartyDemoSession',
         'x-operation-type': 'mutation'
       },
       body: JSON.stringify({
         query: 'mutation StartThirdPartyDemoSession($slug: String!) { ... }',
         variables: { slug: gameSlug }
       })
     });
     
     const data = await response.json();
     // Извлечь sessionID из ответа
     return data.data.startThirdPartyDemoSession.config;
   }
   ```

2. **Интегрируйте в ваш код:**
   - Добавьте функцию в `index.html` или `runtime/offline.js`
   - Вызывайте при каждой загрузке страницы
   - Используйте полученный sessionID для iframe

3. **Обработайте ответ:**
   - Если `config` - это JSON строка, распарсите её
   - Извлеките `sessionID` и `rgs_url`
   - Используйте их для формирования URL iframe

## 📝 Важные моменты

- **GraphQL endpoint:** `/_api/graphql` (относительный URL, значит `https://stake.com/_api/graphql`)
- **Метод:** `POST`
- **Заголовки:** Важны `x-operation-name` и `x-operation-type`
- **Переменные:** Нужен `slug` игры (например, `mirrorimage-drop-the-boss-trump`)

## ⚠️ Ограничения

- Этот API может требовать авторизацию (cookies, токены)
- Может быть защищен от CORS
- Может требовать определенные заголовки

Если прямой вызов не работает, можно:
1. Использовать прокси-сервер
2. Использовать browser extension для перехвата
3. Использовать bookmarklet для извлечения sessionID из iframe (уже реализовано)

## 🎯 Альтернативное решение

Если прямой вызов API не работает из-за CORS/авторизации, используйте уже готовый bookmarklet из `stake-session-grabber.js` - он извлекает sessionID напрямую из iframe на странице stake.com.

