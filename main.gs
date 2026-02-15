// Настройки
const TELEGRAM_TOKEN = 'ТВОЙ_ТОКЕН_БОТА';
const CHAT_ID = 'ТВОЙ_CHAT_ID';
const URL_SHA = "https://factorio.com/download/sha256sums/";

function main() {
  const ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // 1. Получаем текущие данные с сайта и ограничиваем до 4000 символов
  const response = UrlFetchApp.fetch(URL_SHA);
  const currentContent = response.getContentText().substring(0, 4000);
  
  // 2. Загружаем старые данные из таблицы (A1 - хеш, B1 - ID сообщения)
  const lastHash = ss.getRange("A1").getValue();
  const lastPinId = ss.getRange("B1").getValue();
  
  // Если это первый запуск (ячейка пустая)
  if (!lastHash) {
    ss.getRange("A1").setValue(currentContent);
    console.log("Первый запуск. Данные (4000 симв.) сохранены.");
    return;
  }
  
  // 3. Проверяем изменения
  if (currentContent !== lastHash) {
    const version = extractVersion(currentContent);
    
    if (version) {
      console.log("Найдена новая версия: " + version);
      
      // Открепляем старое сообщение, если оно было сохранено ранее
      if (lastPinId) {
        unpinMessage(lastPinId);
      }
      
      // Отправляем новое сообщение и закрепляем его
      const newPinId = sendAndPin(version);
      
      // Сохраняем обновленные данные в таблицу
      ss.getRange("A1").setValue(currentContent);
      ss.getRange("B1").setValue(newPinId);
    }
  } else {
    console.log("Обновлений нет.");
  }
}

function extractVersion(text) {
  // Ищем версию в формате X.Y.Z
  const regex = /Setup_Factorio_(\d+\.\d+\.\d+)\.exe\.zip/;
  const match = text.match(regex);
  return match ? match[1] : null;
}

function sendAndPin(version) {
  const versionEscaped = version.replace(/\./g, '\\.');
  const message = `*🚀 Вышла новая версия Факторио\\!*\n` +
                  `Ссылка на обновление: [factorio\\.com](https://factorio.com/download)\n` +
                  `Версия: *${versionEscaped}*`;
  
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const payload = {
    "chat_id": CHAT_ID,
    "text": message,
    "parse_mode": "MarkdownV2",
    "disable_notification": true
  };
  
  const response = UrlFetchApp.fetch(url, {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  });
  
  const msgId = JSON.parse(response.getContentText()).result.message_id;
  
  // Закрепляем новое сообщение
  const pinUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/pinChatMessage`;
  UrlFetchApp.fetch(pinUrl, {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify({
      "chat_id": CHAT_ID,
      "message_id": msgId,
      "disable_notification": true
    })
  });
  
  return msgId;
}

function unpinMessage(messageId) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/unpinChatMessage`;
  try {
    UrlFetchApp.fetch(url, {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify({
        "chat_id": CHAT_ID,
        "message_id": messageId
      })
    });
    console.log("Предыдущее сообщение откреплено.");
  } catch (e) {
    console.warn("Не удалось открепить сообщение: " + e);
  }
}
