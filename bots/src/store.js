// Storage layer. D1Store runs on Cloudflare D1; MemoryStore has the same interface for tests.

export class D1Store {
  constructor(db) {
    this.db = db;
  }

  async getSession(chatId, bot) {
    const row = await this.db
      .prepare('SELECT data FROM sessions WHERE chat_id = ? AND bot = ?')
      .bind(chatId, bot)
      .first();
    return row ? JSON.parse(row.data) : {};
  }

  async setSession(chatId, bot, data) {
    await this.db
      .prepare(
        `INSERT INTO sessions (chat_id, bot, data, updated_at) VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT (chat_id, bot) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
      )
      .bind(chatId, bot, JSON.stringify(data))
      .run();
  }

  async clearSession(chatId, bot) {
    await this.db.prepare('DELETE FROM sessions WHERE chat_id = ? AND bot = ?').bind(chatId, bot).run();
  }

  async bookingsFor(master, date) {
    const { results } = await this.db
      .prepare("SELECT start, duration FROM bookings WHERE master = ? AND status = 'active' AND start LIKE ?")
      .bind(master, `${date}%`)
      .all();
    return results;
  }

  async createBooking(b) {
    const res = await this.db
      .prepare(
        `INSERT INTO bookings (chat_id, client, service, master, start, duration, price, remind_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(b.chatId, b.client, b.service, b.master, b.start, b.duration, b.price, b.remindAt)
      .run();
    return res.meta.last_row_id;
  }

  async userBookings(chatId, now) {
    const { results } = await this.db
      .prepare("SELECT * FROM bookings WHERE chat_id = ? AND status = 'active' AND start >= ? ORDER BY start")
      .bind(chatId, now)
      .all();
    return results;
  }

  async getBooking(id) {
    return this.db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  }

  async cancelBooking(id) {
    await this.db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").bind(id).run();
  }

  async dueReminders(now) {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM bookings
         WHERE status = 'active' AND reminded = 0 AND remind_at IS NOT NULL AND remind_at <= ? AND start > ?`
      )
      .bind(now, now)
      .all();
    return results;
  }

  async markReminded(id) {
    await this.db.prepare('UPDATE bookings SET reminded = 1 WHERE id = ?').bind(id).run();
  }
}

export class MemoryStore {
  constructor() {
    this.sessions = new Map();
    this.bookings = [];
  }

  async getSession(chatId, bot) {
    return structuredClone(this.sessions.get(`${chatId}:${bot}`) || {});
  }

  async setSession(chatId, bot, data) {
    this.sessions.set(`${chatId}:${bot}`, structuredClone(data));
  }

  async clearSession(chatId, bot) {
    this.sessions.delete(`${chatId}:${bot}`);
  }

  async bookingsFor(master, date) {
    return this.bookings.filter((b) => b.master === master && b.status === 'active' && b.start.startsWith(date));
  }

  async createBooking(b) {
    const id = this.bookings.length + 1;
    this.bookings.push({
      id,
      chat_id: b.chatId,
      client: b.client,
      service: b.service,
      master: b.master,
      start: b.start,
      duration: b.duration,
      price: b.price,
      remind_at: b.remindAt,
      reminded: 0,
      status: 'active'
    });
    return id;
  }

  async userBookings(chatId, now) {
    return this.bookings
      .filter((b) => b.chat_id === chatId && b.status === 'active' && b.start >= now)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  async getBooking(id) {
    return this.bookings.find((b) => b.id === id) || null;
  }

  async cancelBooking(id) {
    const b = await this.getBooking(id);
    if (b) b.status = 'cancelled';
  }

  async dueReminders(now) {
    return this.bookings.filter(
      (b) => b.status === 'active' && !b.reminded && b.remind_at && b.remind_at <= now && b.start > now
    );
  }

  async markReminded(id) {
    const b = await this.getBooking(id);
    if (b) b.reminded = 1;
  }
}
