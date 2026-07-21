/**
 * SQLite connection + schema bootstrap.
 *
 * Uses better-sqlite3 (synchronous, simple, great for a small demo backend).
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'app.db');

// Make sure the directory exists (useful if DB_PATH is overridden).
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS destinations (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,      -- 自然风光 | 人文历史
  tagline       TEXT NOT NULL,      -- 一句推荐理由
  best_duration TEXT NOT NULL,      -- 最佳时长
  best_season   TEXT NOT NULL,      -- 适合季节
  tags          TEXT NOT NULL,      -- JSON array of strings
  lat           REAL NOT NULL,
  lng           REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS transit_options (
  id                TEXT PRIMARY KEY,
  destination_id    TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  mode              TEXT NOT NULL,   -- 交通方式，例如 地铁 / 自驾 / 打车
  duration_estimate TEXT NOT NULL,   -- 耗时估算，例如 "约40分钟"
  cost_estimate     TEXT NOT NULL,   -- 费用估算，例如 "约5元"
  notes             TEXT
);

CREATE INDEX IF NOT EXISTS idx_transit_options_destination
  ON transit_options(destination_id);

-- TODO: add real auth. For now every favorite belongs to a single demo user.
CREATE TABLE IF NOT EXISTS favorites (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        TEXT NOT NULL DEFAULT 'demo-user',
  destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, destination_id)
);

CREATE TABLE IF NOT EXISTS itineraries (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           TEXT NOT NULL DEFAULT 'demo-user',
  name              TEXT,
  start_point       TEXT NOT NULL,
  destination_ids   TEXT NOT NULL,   -- JSON array, original selection order
  ordered_stop_ids  TEXT NOT NULL,   -- JSON array, computed visit order
  total_distance_km REAL NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

db.exec(SCHEMA);

module.exports = db;
