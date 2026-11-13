// Cloudflare Worker entry point for the barbershop bot.
//   POST /barber  -> Telegram webhook
// Telegram proves the request is genuine with the X-Telegram-Bot-Api-Secret-Token header.

import { makeTg } from './tg.js';
import { D1Store } from './store.js';
import { handleBarber, sendReminders } from './barber.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET') return new Response('Bot is running');

    if (request.method !== 'POST' || url.pathname !== '/barber') {
      return new Response('Not found', { status: 404 });
    }

    if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const update = await request.json();
      await handleBarber(update, {
        env,
        store: new D1Store(env.DB),
        tg: makeTg(env.BARBER_TOKEN)
      });
    } catch (err) {
      // Always answer 200, otherwise Telegram keeps re-sending the same update
      console.log('Handler error', err && err.stack ? err.stack : err);
    }
    return new Response('ok');
  },

  // Cron trigger: appointment reminders
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      sendReminders({ env, store: new D1Store(env.DB), tg: makeTg(env.BARBER_TOKEN) }).catch((err) =>
        console.log('Reminder error', err && err.stack ? err.stack : err)
      )
    );
  }
};
