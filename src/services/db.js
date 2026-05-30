const { Pool } = require("pg");

function getPoolConfig() {
  if (process.env.DATABASE_URL?.trim()) {
    const ssl =
      process.env.PGSSL === "true"
        ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== "false" }
        : undefined;
    return { connectionString: process.env.DATABASE_URL.trim(), ssl };
  }

  return {
    host: process.env.PGHOST || process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.PGPORT || process.env.DB_PORT) || 5432,
    user: process.env.PGUSER || process.env.DB_USER || "postgres",
    password: process.env.PGPASSWORD ?? process.env.DB_PASSWORD ?? "",
    database: process.env.PGDATABASE || process.env.DB_NAME || "web_project",
    max: Number(process.env.DB_POOL_LIMIT) || 10,
  };
}

const pool = new Pool(getPoolConfig());

async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] || null;
}

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'local',
      provider_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT,
      picture TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_provider_id
      ON users(provider, provider_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
      ON users(email);

    CREATE TABLE IF NOT EXISTS contact_submissions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS work_submissions (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      resume TEXT,
      skill TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_submissions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_submissions(status);
    CREATE INDEX IF NOT EXISTS idx_work_created ON work_submissions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_work_status ON work_submissions(status);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      message TEXT NOT NULL,
      page_url TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_status ON chat_messages(status);

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_razorpay ON orders(razorpay_order_id);
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
      ) THEN
        ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
      END IF;
    END $$;
  `);
}

let initPromise = null;

function initDb() {
  if (!initPromise) {
    initPromise = migrate().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

module.exports = { pool, query, queryOne, initDb };
