// Registers the bot webhook in Telegram after deploy.
// Usage (PowerShell):
//   $env:WORKER_URL="https://telegram-bots-demo.<name>.workers.dev"
//   $env:BARBER_TOKEN="..."; $env:WEBHOOK_SECRET="..."
//   npm run webhooks

const { WORKER_URL, BARBER_TOKEN, WEBHOOK_SECRET } = process.env;

if (!WORKER_URL || !BARBER_TOKEN || !WEBHOOK_SECRET) {
  console.error('Задайте переменные WORKER_URL, BARBER_TOKEN и WEBHOOK_SECRET.');
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${BARBER_TOKEN}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    url: `${WORKER_URL.replace(/\/$/, '')}/barber`,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query']
  })
});
const json = await res.json();
console.log(json.ok ? 'Вебхук установлен' : `Ошибка: ${json.description}`);
