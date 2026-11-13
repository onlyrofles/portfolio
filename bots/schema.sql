-- Conversation drafts: one row per user and bot
CREATE TABLE IF NOT EXISTS sessions (
  chat_id INTEGER NOT NULL,
  bot TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (chat_id, bot)
);

-- Barbershop appointments; times are local strings "YYYY-MM-DD HH:MM"
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  client TEXT NOT NULL,
  service TEXT NOT NULL,
  master TEXT NOT NULL,
  start TEXT NOT NULL,
  duration INTEGER NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  remind_at TEXT,
  reminded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_master_start ON bookings (master, start);
CREATE INDEX IF NOT EXISTS idx_bookings_chat ON bookings (chat_id, start);
