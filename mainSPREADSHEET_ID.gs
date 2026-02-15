// Настройки
const TELEGRAM_TOKEN = 'ТВОЙ_ТОКЕН_БОТА';
const CHAT_ID = 'ТВОЙ_CHAT_ID';
const SPREADSHEET_ID = 'ТВОЙ_SPREADSHEET_ID';
const URL_SHA = "https://factorio.com/download/sha256sums/";

function main() {
  // Подключаемся к конкретной таблице по ID
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  
  // Читаем старые данные
  // A1 - сохраненный хеш, B1 - ID сообщения для открепления
  const lastHash = ss.getRange("A1").getValue();
  const lastPinId = ss.getRange("B1").getValue();

  // --- ЛОГИКА ОТКРЕПЛЕНИЯ ---
  // Если в B1 есть ID, открепляем сообщение и очищаем ячейку в любом случае
  if (lastPinId) {
    unpinMessage(lastPinId);
    ss.getRange("B1").clearContent(); 
    console.log("Ячейка B1 очищена после открепления.");
  }

  // --- ЛОГИКА ПРОВЕРКИ ОБНОВЛЕНИЙ ---
  const response = UrlFetchApp.fetch(URL_SHA);
  const currentContent = response.getContentText().substring(0, 4000);

  // Если это первый запуск (нет хеша в A1)
  if (!lastHash) {
    ss.getRange("A1").setValue(currentContent);
    console.log("Первый запуск. Хеш сохранен.");
    return;
  }

  // Если хеш изменился
  if (currentContent !== lastHash) {
    const version = extractVersion(currentContent);
    
    if (version) {
      console.log("Новая версия: " + version);
      
      // Отправляем новое и закрепляем
      const newPinId = sendAndPin(version);
      
      // Обновляем хеш в A1 и записываем новый ID в B1
      ss.getRange("A1").setValue(currentContent);
      ss.getRange("B1").setValue(newPinId);
    }
  } else {
    console.log("Обновлений нет.");
  }
}

function extractVersion(text) {
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

  // Закрепляем
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
    console.log("Сообщение " + messageId + " откреплено.");
  } catch (e) {
    console.warn("Не удалось открепить " + messageId + ". Возможно, оно уже откреплено вручную.");
  }
}
