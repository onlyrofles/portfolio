// Barbershop bot: pick a service, a master, a day and a time; get a reminder the day before.

import { inline, escapeHtml, rub, clientName } from './tg.js';
import { nowLocal, todayLocal, addMinutes, addDays, weekday, minutesOfDay, hhmm, dayLabel, whenLabel } from './time.js';

const BOT = 'barber';

export const SERVICES = {
  cut: { icon: '✂️', name: 'Мужская стрижка', price: 1200, min: 45 },
  beard: { icon: '🧔', name: 'Моделирование бороды', price: 800, min: 30 },
  combo: { icon: '🔥', name: 'Стрижка + борода', price: 1800, min: 75 },
  kids: { icon: '🧒', name: 'Детская стрижка', price: 900, min: 40 },
  shave: { icon: '🪒', name: 'Королевское бритьё', price: 1000, min: 30 }
};

const LINE = '━━━━━━━━━━━━━━';

export const MASTERS = { artem: 'Артём', max: 'Максим' };

const OPEN = 10 * 60;   // 10:00
const CLOSE = 20 * 60;  // 20:00
const STEP = 30;        // slot grid in minutes
const DAYS_AHEAD = 7;
const CLOSED_WEEKDAY = 0; // Sunday

const BACK = ['« В меню', 'menu'];

const mainMenu = () =>
  inline([
    [['✂️ Записаться', 'book']],
    [['📋 Мои записи', 'my']],
    [['💈 Услуги и цены', 'price']]
  ]);

const nowOf = (env) => nowLocal(Number(env.TZ_OFFSET_MIN ?? 180));

// Free start times (minutes from midnight) for a master on a date
async function freeSlots(store, master, date, service, now) {
  const busy = await store.bookingsFor(master, date);
  const earliest = addMinutes(now, 30); // do not offer slots starting within 30 minutes
  const slots = [];

  for (let t = OPEN; t + service.min <= CLOSE; t += STEP) {
    if (`${date} ${hhmm(t)}` <= earliest) continue;
    const clash = busy.some((b) => {
      const bs = minutesOfDay(b.start);
      return t < bs + b.duration && t + service.min > bs;
    });
    if (!clash) slots.push(t);
  }
  return slots;
}

const WELCOME =
  '💈 <b>Борода и ножницы</b>\n' +
  '<i>Барбершоп · запись онлайн</i>\n\n' +
  'Выберите услугу, мастера и удобное время. Это займёт меньше минуты.\n\n' +
  '🕙 Ежедневно 10:00–20:00, воскресенье выходной';

async function showMenu(ctx, text = WELCOME) {
  const { tg, chatId, messageId, env } = ctx;
  await tg.menu(chatId, messageId, text, mainMenu(), env.BANNER_URL);
}

async function showServices(ctx) {
  const rows = Object.entries(SERVICES).map(([key, s]) => [[`${s.icon} ${s.name} · ${rub(s.price)}`, `s:${key}`]]);
  rows.push([BACK]);
  await ctx.tg.show(ctx.chatId, ctx.messageId, '✂️ <b>Выберите услугу</b>', inline(rows));
}

async function showMasters(ctx) {
  const rows = Object.entries(MASTERS).map(([key, name]) => [[`💈 ${name}`, `m:${key}`]]);
  rows.push([['« Назад', 'book']]);
  await ctx.tg.show(ctx.chatId, ctx.messageId, '💈 <b>К какому мастеру записать?</b>', inline(rows));
}

async function showDays(ctx, draft) {
  const { store, env } = ctx;
  const now = nowOf(env);
  const service = SERVICES[draft.service];
  const buttons = [];

  for (let i = 0; i <= DAYS_AHEAD; i++) {
    const date = addDays(todayLocal(Number(env.TZ_OFFSET_MIN ?? 180)), i);
    if (weekday(date) === CLOSED_WEEKDAY) continue;
    const slots = await freeSlots(store, draft.master, date, service, now);
    if (slots.length) buttons.push([dayLabel(date), `d:${date}`]);
  }

  if (!buttons.length) {
    await ctx.tg.show(ctx.chatId, ctx.messageId, 'К сожалению, на ближайшую неделю свободных мест у этого мастера нет.', inline([[['« Другой мастер', `s:${draft.service}`]]]));
    return;
  }

  const rows = [];
  for (let i = 0; i < buttons.length; i += 3) rows.push(buttons.slice(i, i + 3));
  rows.push([['« Назад', `s:${draft.service}`]]);
  await ctx.tg.show(ctx.chatId, ctx.messageId, '📅 <b>Выберите день</b>', inline(rows));
}

async function showTimes(ctx, draft) {
  const slots = await freeSlots(ctx.store, draft.master, draft.date, SERVICES[draft.service], nowOf(ctx.env));
  if (!slots.length) {
    await ctx.tg.show(ctx.chatId, ctx.messageId, 'На этот день места закончились, выберите другой.', inline([[['« К выбору дня', `m:${draft.master}`]]]));
    return;
  }
  const buttons = slots.map((t) => [hhmm(t), `t:${hhmm(t).replace(':', '')}`]);
  const rows = [];
  for (let i = 0; i < buttons.length; i += 4) rows.push(buttons.slice(i, i + 4));
  rows.push([['« Назад', `m:${draft.master}`]]);
  await ctx.tg.show(ctx.chatId, ctx.messageId, `🕙 <b>Свободное время · ${dayLabel(draft.date)}</b>`, inline(rows));
}

function summary(draft) {
  const s = SERVICES[draft.service];
  return [
    `${s.icon} <b>${escapeHtml(s.name)}</b>`,
    LINE,
    `💈 Мастер: <b>${MASTERS[draft.master]}</b>`,
    `📅 Когда: <b>${dayLabel(draft.date)}, ${draft.time}</b>`,
    `⏱ Длительность: ${s.min} мин`,
    `💰 Стоимость: <b>${rub(s.price)}</b>`
  ].join('\n');
}

async function confirmBooking(ctx, draft) {
  await ctx.tg.show(
    ctx.chatId,
    ctx.messageId,
    `📝 <b>Проверьте запись</b>\n\n${summary(draft)}`,
    inline([[['✅ Подтвердить', 'ok']], [['« Изменить время', `d:${draft.date}`]]])
  );
}

async function finalize(ctx, draft) {
  const { store, tg, chatId, env, from } = ctx;
  const service = SERVICES[draft.service];
  const start = `${draft.date} ${draft.time}`;
  const now = nowOf(env);

  // Re-check the slot: someone else may have taken it while the user was deciding
  const t = minutesOfDay(start);
  const slots = await freeSlots(store, draft.master, draft.date, service, now);
  if (!slots.includes(t)) {
    await tg.show(chatId, ctx.messageId, 'Это время только что заняли. Выберите другое.', inline([[['Выбрать время', `d:${draft.date}`]]]));
    return;
  }

  // Remind 24 hours before, unless the visit is sooner than that
  const reminderTime = addMinutes(start, -24 * 60);
  const remindAt = reminderTime > addMinutes(now, 60) ? reminderTime : null;

  const client = clientName(from);
  const id = await store.createBooking({
    chatId,
    client,
    service: draft.service,
    master: draft.master,
    start,
    duration: service.min,
    price: service.price,
    remindAt
  });
  await store.clearSession(chatId, BOT);

  await tg.show(
    chatId,
    ctx.messageId,
    `✅ <b>Вы записаны!</b>\n\n${summary(draft)}\n\n📍 ул. Примерная, 1 <i>(демо)</i>\n${remindAt ? '🔔 Напомню за день до визита.' : ''}`,
    mainMenu()
  );

  await notifyOwner(
    ctx,
    `🆕 <b>Новая запись #${id}</b>\n👤 ${escapeHtml(client)}\n${service.icon} ${escapeHtml(service.name)}\n💈 ${MASTERS[draft.master]}\n📅 ${dayLabel(draft.date)}, ${draft.time}\n💰 ${rub(service.price)}`
  );
}

// Demo behaviour: the administrator gets the notification, and the person testing the bot
// sees the very same message, so they can watch the administrator's side without them.
async function notifyOwner(ctx, text) {
  const { tg, env, chatId } = ctx;
  const message = `📣 <b>Уведомление администратору</b>\n${LINE}\n${text}`;

  if (env.OWNER_CHAT_ID && Number(env.OWNER_CHAT_ID) !== chatId) {
    await tg.send(env.OWNER_CHAT_ID, message);
  }
  await tg.send(chatId, `${message}\n${LINE}\n<i>Демо: так уведомления видит администратор барбершопа</i>`);
}

async function showMyBookings(ctx) {
  const list = await ctx.store.userBookings(ctx.chatId, nowOf(ctx.env));
  if (!list.length) {
    await ctx.tg.show(ctx.chatId, ctx.messageId, 'У вас нет предстоящих записей.', inline([[['✂️ Записаться', 'book']], [BACK]]));
    return;
  }
  const text = list
    .map((b) => `${SERVICES[b.service]?.icon ?? '✂️'} <b>${whenLabel(b.start)}</b>\n      ${escapeHtml(SERVICES[b.service]?.name ?? b.service)} · ${MASTERS[b.master] ?? b.master}`)
    .join('\n\n');
  const rows = list.map((b) => [[`✖ Отменить ${whenLabel(b.start)}`, `x:${b.id}`]]);
  rows.push([BACK]);
  await ctx.tg.show(ctx.chatId, ctx.messageId, `📋 <b>Ваши записи</b>\n${LINE}\n${text}`, inline(rows));
}

async function cancelBooking(ctx, id, confirmed) {
  const booking = await ctx.store.getBooking(id);
  // Only the owner of the booking may cancel it
  if (!booking || booking.chat_id !== ctx.chatId || booking.status !== 'active') {
    await ctx.tg.show(ctx.chatId, ctx.messageId, 'Запись не найдена.', mainMenu());
    return;
  }
  if (!confirmed) {
    await ctx.tg.show(
      ctx.chatId,
      ctx.messageId,
      `Отменить запись на ${whenLabel(booking.start)}?`,
      inline([[['Да, отменить', `xx:${id}`], ['Нет', 'my']]])
    );
    return;
  }
  await ctx.store.cancelBooking(id);
  await ctx.tg.show(ctx.chatId, ctx.messageId, 'Запись отменена. Ждём вас в другой раз!', mainMenu());
  await notifyOwner(ctx, `❌ <b>Отмена записи #${id}</b>\n${escapeHtml(booking.client)}, ${whenLabel(booking.start)}`);
}

async function showPrices(ctx) {
  const lines = Object.values(SERVICES).map((s) => `${s.icon} ${escapeHtml(s.name)}\n      <b>${rub(s.price)}</b> · ${s.min} мин`);
  await ctx.tg.show(
    ctx.chatId,
    ctx.messageId,
    `💈 <b>Услуги и цены</b>\n${LINE}\n${lines.join('\n\n')}\n${LINE}\n🕙 10:00–20:00, воскресенье выходной\n<i>Демо-проект: цены и адрес вымышленные.</i>`,
    inline([[['✂️ Записаться', 'book']], [BACK]])
  );
}

export async function handleBarber(update, deps) {
  const base = { ...deps };

  if (update.message) {
    const msg = update.message;
    const ctx = { ...base, chatId: msg.chat.id, from: msg.from, messageId: null };
    if (msg.text === '/myid') {
      await ctx.tg.send(ctx.chatId, `Ваш chat id: <code>${ctx.chatId}</code>`);
      return;
    }
    await showMenu(ctx);
    return;
  }

  const cb = update.callback_query;
  if (!cb) return;

  const ctx = { ...base, chatId: cb.message.chat.id, from: cb.from, messageId: cb.message.message_id };
  await ctx.tg.answer(cb.id);

  const [action, arg] = cb.data.split(':');
  const draft = await ctx.store.getSession(ctx.chatId, BOT);

  switch (action) {
    case 'menu':
      await ctx.store.clearSession(ctx.chatId, BOT);
      return showMenu(ctx, 'Главное меню:');
    case 'book':
      return showServices(ctx);
    case 's':
      if (!SERVICES[arg]) return showServices(ctx);
      await ctx.store.setSession(ctx.chatId, BOT, { service: arg });
      return showMasters(ctx);
    case 'm':
      if (!MASTERS[arg] || !draft.service) return showServices(ctx);
      Object.assign(draft, { master: arg });
      delete draft.date;
      delete draft.time;
      await ctx.store.setSession(ctx.chatId, BOT, draft);
      return showDays(ctx, draft);
    case 'd':
      if (!draft.service || !draft.master) return showServices(ctx);
      draft.date = arg;
      delete draft.time;
      await ctx.store.setSession(ctx.chatId, BOT, draft);
      return showTimes(ctx, draft);
    case 't':
      if (!draft.service || !draft.master || !draft.date) return showServices(ctx);
      draft.time = `${arg.slice(0, 2)}:${arg.slice(2)}`;
      await ctx.store.setSession(ctx.chatId, BOT, draft);
      return confirmBooking(ctx, draft);
    case 'ok':
      if (!draft.time) return showServices(ctx);
      return finalize(ctx, draft);
    case 'my':
      return showMyBookings(ctx);
    case 'x':
      return cancelBooking(ctx, Number(arg), false);
    case 'xx':
      return cancelBooking(ctx, Number(arg), true);
    case 'price':
      return showPrices(ctx);
    default:
      return showMenu(ctx);
  }
}

// Called by the cron trigger: send reminders that are due
export async function sendReminders({ store, tg, env }) {
  const due = await store.dueReminders(nowOf(env));
  for (const b of due) {
    const name = SERVICES[b.service]?.name ?? b.service;
    await tg.send(
      b.chat_id,
      `⏰ <b>Напоминание</b>\nЗавтра в ${b.start.slice(11, 16)} вас ждёт ${MASTERS[b.master] ?? b.master}: ${escapeHtml(name)}.\nЕсли планы изменились, отмените запись в разделе «Мои записи».`,
      inline([[['📋 Мои записи', 'my']]])
    );
    await store.markReminded(b.id);
  }
  return due.length;
}
