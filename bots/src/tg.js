// Thin Telegram Bot API client. Every bot handler talks to Telegram only through this interface,
// which lets the tests replace it with a fake.

export function makeTg(token, fetchFn = fetch) {
  async function call(method, body) {
    const res = await fetchFn(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({ ok: false }));
    if (!json.ok) console.log('Telegram error', method, JSON.stringify(json));
    return json;
  }

  return {
    send(chatId, text, markup) {
      return call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', reply_markup: markup });
    },

    // Edit the message the user just pressed a button on. If it cannot be edited
    // (for example it is the photo menu), send a new message and delete the old one.
    async show(chatId, messageId, text, markup) {
      if (messageId) {
        const res = await call('editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: 'HTML',
          reply_markup: markup
        });
        if (res.ok || /not modified/i.test(res.description || '')) return res;
      }
      const sent = await call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', reply_markup: markup });
      if (messageId && sent.ok) await call('deleteMessage', { chat_id: chatId, message_id: messageId });
      return sent;
    },

    // Main menu with a banner picture; falls back to plain text if the photo cannot be sent
    async menu(chatId, messageId, caption, markup, photoUrl) {
      let res = { ok: false };
      if (photoUrl) {
        res = await call('sendPhoto', {
          chat_id: chatId,
          photo: photoUrl,
          caption,
          parse_mode: 'HTML',
          reply_markup: markup
        });
      }
      if (!res.ok) {
        res = await call('sendMessage', { chat_id: chatId, text: caption, parse_mode: 'HTML', reply_markup: markup });
      }
      if (messageId && res.ok) await call('deleteMessage', { chat_id: chatId, message_id: messageId });
      return res;
    },

    answer(callbackId, text) {
      return call('answerCallbackQuery', { callback_query_id: callbackId, text });
    }
  };
}

// Inline keyboard from rows of [label, callbackData]
export const inline = (rows) => ({
  inline_keyboard: rows.map((row) => row.map(([text, data]) => ({ text, callback_data: data })))
});

export const escapeHtml = (s) =>
  String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export const rub = (n) => `${Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ')} ₽`;

export function clientName(from) {
  const name = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || 'Клиент';
  return from?.username ? `${name} (@${from.username})` : name;
}
