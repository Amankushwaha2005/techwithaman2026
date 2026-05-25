const fs = require("fs");
const path = require("path");

const Database = require("better-sqlite3");

const DEFAULT_DB_PATH = path.join(__dirname, "..", "..", "data", "app.sqlite");

function openDb() {
  const dbPath = process.env.DB_PATH || DEFAULT_DB_PATH;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

function tableHasColumn(db, table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === column);
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL DEFAULT 'local',
      provider_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT,
      picture TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_provider_id
      ON users(provider, provider_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
      ON users(email);
  `);

  if (!tableHasColumn(db, "users", "role")) {
    db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS work_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      resume TEXT,
      skill TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_submissions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_submissions(status);
    CREATE INDEX IF NOT EXISTS idx_work_created ON work_submissions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_work_status ON work_submissions(status);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      page_url TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_status ON chat_messages(status);

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      service TEXT NOT NULL,
      plan TEXT NOT NULL,
      notes TEXT,
      total_inr INTEGER NOT NULL,
      amount_inr INTEGER NOT NULL,
      advance_percent INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_razorpay ON orders(razorpay_order_id);
  `);
}

const db = openDb();
migrate(db);

module.exports = { db };

