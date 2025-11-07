/* 🔗 Bookmarklet для автоматического извлечения sessionID со страницы stake.com */

// Это bookmarklet - скопируйте весь код в одну строку и создайте закладку

javascript:(function(){
  'use strict';
  
  console.log('[SESSION-GRABBER] 🔍 Ищем iframe с игрой...');
  
  // Ищем iframe с игрой
  const iframes = Array.from(document.querySelectorAll('iframe'));
  const gameIframe = iframes.find(iframe => {
    const src = iframe.src || iframe.getAttribute('src') || '';
    return /mirror-image-gaming\.live\.stake-engine\.com\/drop-the-boss/i.test(src);
  });
  
  if (!gameIframe) {
    alert('❌ Iframe с игрой не найден!\n\nУбедитесь, что:\n1. Страница игры полностью загружена\n2. Игра открыта (не только список игр)\n3. Попробуйте обновить страницу');
    console.error('[SESSION-GRABBER] Iframe не найден. Найдено iframe:', iframes.length);
    iframes.forEach((iframe, i) => {
      console.log(`Iframe ${i}:`, iframe.src || iframe.getAttribute('src'));
    });
    return;
  }
  
  const iframeSrc = gameIframe.src || gameIframe.getAttribute('src');
  console.log('[SESSION-GRABBER] ✅ Найден iframe:', iframeSrc);
  
  try {
    const url = new URL(iframeSrc);
    const sessionID = url.searchParams.get('sessionID');
    const rgsUrl = url.searchParams.get('rgs_url');
    const currency = url.searchParams.get('currency') || 'USD';
    const lang = url.searchParams.get('lang') || 'ru';
    
    if (!sessionID || !rgsUrl) {
      alert('❌ Не удалось извлечь sessionID или rgs_url из iframe!\n\nURL iframe: ' + iframeSrc);
      console.error('[SESSION-GRABBER] Параметры не найдены. URL:', url.href);
      console.error('[SESSION-GRABBER] Search params:', Array.from(url.searchParams.entries()));
      return;
    }
    
    console.log('[SESSION-GRABBER] ✅ Извлечено:');
    console.log('  sessionID:', sessionID);
    console.log('  rgs_url:', rgsUrl);
    console.log('  currency:', currency);
    console.log('  lang:', lang);
    
    // Формируем URL для вашей офлайн-страницы
    // ИЗМЕНИТЕ ЭТОТ URL НА АДРЕС ВАШЕГО САЙТА!
    const baseUrl = window.location.origin; // Или укажите конкретный URL: 'http://localhost:8080'
    const offlineUrl = new URL('/', baseUrl);
    offlineUrl.searchParams.set('sessionID', sessionID);
    offlineUrl.searchParams.set('rgs_url', rgsUrl);
    offlineUrl.searchParams.set('currency', currency);
    offlineUrl.searchParams.set('lang', lang);
    
    const finalUrl = offlineUrl.toString();
    console.log('[SESSION-GRABBER] 🚀 Переход на:', finalUrl);
    
    // Копируем в буфер обмена
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(finalUrl).then(() => {
        console.log('[SESSION-GRABBER] ✅ URL скопирован в буфер обмена');
      }).catch(err => {
        console.warn('[SESSION-GRABBER] ⚠️ Не удалось скопировать в буфер:', err);
      });
    }
    
    // Показываем результат
    const result = `✅ SessionID успешно извлечен!\n\n` +
      `SessionID: ${sessionID.substring(0, 20)}...\n` +
      `RGS URL: ${rgsUrl}\n` +
      `Currency: ${currency}\n\n` +
      `Перейти на офлайн-страницу?`;
    
    if (confirm(result)) {
      window.location.href = finalUrl;
    } else {
      // Показываем URL для ручного копирования
      prompt('Скопируйте этот URL:', finalUrl);
    }
    
  } catch (error) {
    console.error('[SESSION-GRABBER] ❌ Ошибка:', error);
    alert('❌ Ошибка при извлечении данных:\n' + error.message);
  }
})();

/* 
ИНСТРУКЦИЯ ПО ИСПОЛЬЗОВАНИЮ:

1. Скопируйте весь код выше (начиная с "javascript:")
2. Создайте новую закладку в браузере
3. В поле "URL" вставьте скопированный код
4. Назовите закладку, например: "Get SessionID"
5. Откройте страницу игры на stake.com
6. Нажмите на закладку
7. Вы будете перенаправлены на вашу офлайн-страницу с новым sessionID

АЛЬТЕРНАТИВА: Используйте как userscript в Tampermonkey
*/

