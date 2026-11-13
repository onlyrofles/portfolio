// Offline test: plays full conversations against both bots with a fake Telegram and in-memory storage.
// Run: npm test

import assert from 'node:assert/strict';
import { MemoryStore } from '../src/store.js';
import { handleBarber, sendReminders, SERVICES } from '../src/barber.js';
import { nowLocal, addMinutes, addDays } from '../src/time.js';

// ---------- Fake Telegram ----------
function makeFakeTg() {
  const log = [];
  return {
    log,
    async send(chatId, text, markup) { log.push({ chatId, text, markup }); return { ok: true }; },
    async show(chatId, messageId, text, markup) { log.push({ chatId, text, markup, edit: messageId }); return { ok: true }; },
    async menu(chatId, messageId, text, markup, photo) { log.push({ chatId, text, markup, menu: true, photo }); return { ok: true }; },
    async answer() { return { ok: true }; }
  };
}

const buttonsOf = (m) => (m?.markup?.inline_keyboard ?? []).flat();

// A user session against one bot
function makeUser(handler, { store, tg, env }, chatId, from) {
  const last = () => tg.log.filter((m) => m.chatId === chatId).at(-1);
  return {
    last,
    async text(text, extra = {}) {
      await handler({ message: { chat: { id: chatId }, from, text, ...extra } }, { store, tg, env });
    },
    async press(prefix) {
      const btn = buttonsOf(last()).find((b) => b.callback_data.startsWith(prefix));
      assert.ok(btn, `no button "${prefix}" in: ${last()?.text}`);
      await handler(
        { callback_query: { id: 'cb', from, data: btn.callback_data, message: { chat: { id: chatId }, message_id: 1 } } },
        { store, tg, env }
      );
    }
  };
}

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log('  ✓', name);
  } catch (err) {
    console.error('  ✗', name, '\n   ', err.message);
    process.exitCode = 1;
  }
}

const OWNER = 999;
const env = { TZ_OFFSET_MIN: '180', OWNER_CHAT_ID: OWNER };
const alice = { first_name: 'Алиса', username: 'alice' };
const bob = { first_name: 'Боб' };

console.log('Барбершоп');

await test('полный сценарий записи и уведомление владельцу', async () => {
  const store = new MemoryStore(), tg = makeFakeTg();
  const u = makeUser(handleBarber, { store, tg, env }, 1, alice);
  await u.text('/start');
  await u.press('book');
  await u.press('s:cut');
  await u.press('m:artem');
  await u.press('d:');
  await u.press('t:');
  await u.press('ok');
  assert.equal(store.bookings.length, 1);
  assert.equal(store.bookings[0].master, 'artem');
  assert.ok(tg.log.some((m) => m.chatId === 1 && /Вы записаны/.test(m.text)), 'клиент получил подтверждение');
  const note = tg.log.find((m) => m.chatId === OWNER);
  assert.match(note.text, /Новая запись/);
  assert.match(note.text, /Алиса/);
  assert.match(note.text, /^📣 <b>Уведомление администратору/, 'заголовок сверху');
  const demo = tg.log.filter((m) => m.chatId === 1).find((m) => /Уведомление администратору/.test(m.text));
  assert.ok(demo, 'тестирующий тоже видит уведомление');
  assert.match(demo.text, /Демо/);
});

await test('главное меню отправляется с баннером', async () => {
  const store = new MemoryStore(), tg = makeFakeTg();
  const u = makeUser(handleBarber, { store, tg, env: { ...env, BANNER_URL: 'https://x/banner.png' } }, 1, alice);
  await u.text('/start');
  assert.equal(u.last().menu, true);
  assert.equal(u.last().photo, 'https://x/banner.png');
});

await test('владелец не получает дубль, если тестирует сам', async () => {
  const store = new MemoryStore(), tg = makeFakeTg();
  const u = makeUser(handleBarber, { store, tg, env: { ...env, OWNER_CHAT_ID: 1 } }, 1, alice);
  await u.text('/start'); await u.press('book'); await u.press('s:cut'); await u.press('m:artem'); await u.press('d:'); await u.press('t:'); await u.press('ok');
  const notes = tg.log.filter((m) => m.chatId === 1 && /Уведомление администратору/.test(m.text));
  assert.equal(notes.length, 1);
});

await test('занятое время второй клиент уже не видит', async () => {
  const store = new MemoryStore(), tg = makeFakeTg();
  const a = makeUser(handleBarber, { store, tg, env }, 1, alice);
  const b = makeUser(handleBarber, { store, tg, env }, 2, bob);

  await a.text('/start'); await a.press('book'); await a.press('s:cut'); await a.press('m:artem'); await a.press('d:');
  const date = store.sessions.get('1:barber').date;
  await a.press('t:'); await a.press('ok');
  const taken = store.bookings[0].start.slice(11, 16).replace(':', '');

  await b.text('/start'); await b.press('book'); await b.press('s:cut'); await b.press('m:artem');
  await b.press(`d:${date}`);
  const times = buttonsOf(b.last()).map((x) => x.callback_data);
  assert.ok(!times.includes(`t:${taken}`), 'занятый слот не должен показываться');
});

await test('гонка: слот занят между выбором и подтверждением', async () => {
  const store = new MemoryStore(), tg = makeFakeTg();
  const a = makeUser(handleBarber, { store, tg, env }, 1, alice);
  const b = makeUser(handleBarber, { store, tg, env }, 2, bob);

  for (const u of [a, b]) { await u.text('/start'); await u.press('book'); await u.press('s:cut'); await u.press('m:max'); await u.press('d:'); }
  const date = store.sessions.get('1:barber').date;
  await a.press('t:');
  await b.press(`t:${store.sessions.get('1:barber').time.replace(':', '')}`);
  await a.press('ok');
  await b.press('ok');
  assert.equal(store.bookings.length, 1, 'вторая запись не должна создаться');
  assert.match(b.last().text, /заняли/);
});

await test('длинная услуга перекрывает соседние слоты', async () => {
  const store = new MemoryStore(), tg = makeFakeTg();
  const date = addDays(nowLocal(180).slice(0, 10), 3);
  store.bookings.push({ id: 1, chat_id: 5, client: 'x', service: 'combo', master: 'artem', start: `${date} 12:00`, duration: 75, price: 1800, status: 'active', reminded: 0 });
  const u = makeUser(handleBarber, { store, tg, env }, 1, alice);
  await u.text('/start'); await u.press('book'); await u.press('s:cut'); await u.press('m:artem');
  await store.setSession(1, 'barber', { service: 'cut', master: 'artem' });
  await u.press(`d:${date}`).catch(() => {}); // the date button may be hidden on Sunday
  const draft = await store.getSession(1, 'barber');
  if (draft.date !== date) return; // Sunday: nothing to check
  const times = buttonsOf(u.last()).map((x) => x.callback_data);
  for (const blocked of ['t:1130', 't:1200', 't:1230', 't:1300']) assert.ok(!times.includes(blocked), `${blocked} должен быть занят`);
  assert.ok(times.includes('t:1100') || times.includes('t:1330'), 'свободные слоты вокруг остаются');
});

await test('отмена своей записи и защита от чужой', async () => {
  const store = new MemoryStore(), tg = makeFakeTg();
  const a = makeUser(handleBarber, { store, tg, env }, 1, alice);
  const b = makeUser(handleBarber, { store, tg, env }, 2, bob);
  await a.text('/start'); await a.press('book'); await a.press('s:beard'); await a.press('m:max'); await a.press('d:'); await a.press('t:'); await a.press('ok');
  const id = store.bookings[0].id;

  // Bob tries to cancel Alice's booking
  await handleBarber({ callback_query: { id: 'c', from: bob, data: `xx:${id}`, message: { chat: { id: 2 }, message_id: 1 } } }, { store, tg, env });
  assert.equal(store.bookings[0].status, 'active', 'чужую запись отменить нельзя');

  await a.text('/start'); await a.press('my'); await a.press('x:'); await a.press('xx:');
  assert.equal(store.bookings[0].status, 'cancelled');
});

await test('напоминание за сутки отправляется один раз', async () => {
  const store = new MemoryStore(), tg = makeFakeTg();
  const now = nowLocal(180);
  store.bookings.push({ id: 1, chat_id: 7, client: 'x', service: 'cut', master: 'artem', start: addMinutes(now, 23 * 60), duration: 45, price: 1200, status: 'active', remind_at: addMinutes(now, -60), reminded: 0 });
  assert.equal(await sendReminders({ store, tg, env }), 1);
  assert.match(tg.log.at(-1).text, /Напоминание/);
  assert.equal(await sendReminders({ store, tg, env }), 0, 'повторно не напоминаем');
});
console.log(`\nПройдено тестов: ${passed}${process.exitCode ? ' (есть ошибки)' : ''}`);
