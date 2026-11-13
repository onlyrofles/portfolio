# Telegram-бот записи в барбершоп на Cloudflare Workers

Демо-проект. Работает бесплатно и круглосуточно через вебхук.

## Что умеет

Выбор услуги, мастера, дня и времени; защита от двойной записи; «Мои записи» с отменой;
напоминание за сутки до визита; уведомления владельцу о новых записях и отменах.

## Проверка без Telegram

```
npm test
```

## Запуск (один раз, около 15 минут)

1. **Бот.** В Telegram откройте `@BotFather`, команда `/newbot`. Сохраните токен.
2. **Cloudflare.** Зарегистрируйтесь на cloudflare.com (карта не нужна).
3. Установка и вход:
   ```
   npm install
   npx wrangler login
   ```
4. **База данных:**
   ```
   npx wrangler d1 create bots-db
   ```
   Скопируйте `database_id` из ответа в `wrangler.toml`, затем:
   ```
   npx wrangler d1 execute bots-db --remote --file=schema.sql
   ```
5. **Секреты** (каждая команда спросит значение):
   ```
   npx wrangler secret put BARBER_TOKEN
   npx wrangler secret put WEBHOOK_SECRET
   ```
   `WEBHOOK_SECRET` — любая длинная случайная строка из букв и цифр.
6. **Выкладка:**
   ```
   npx wrangler deploy
   ```
   В конце будет адрес вида `https://telegram-bots-demo.<имя>.workers.dev`.
7. **Вебхук** (PowerShell):
   ```
   $env:WORKER_URL="https://telegram-bots-demo.<имя>.workers.dev"
   $env:BARBER_TOKEN="..."; $env:WEBHOOK_SECRET="..."
   npm run webhooks
   ```
8. **Уведомления владельцу.** Напишите боту `/myid`, он ответит вашим chat id. Затем:
   ```
   npx wrangler secret put OWNER_CHAT_ID
   ```

Токены и секреты нигде не хранятся в коде.

## Где что менять

- Услуги, мастера, часы работы: `src/barber.js` (вверху файла).
- Часовой пояс: `TZ_OFFSET_MIN` в `wrangler.toml` (в минутах от UTC).
