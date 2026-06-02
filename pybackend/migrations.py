from pybackend.db import execute, query


def migrate() -> None:
    # Keep in sync with legacy Node migrate() logic to preserve schema shape.
    execute(
        """
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
        """
    )

    execute(
        """
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
      ) THEN
        ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
      END IF;
    END $$;
        """
    )

    execute(
        """
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'advance_paid_inr'
      ) THEN
        ALTER TABLE orders ADD COLUMN advance_paid_inr INTEGER;
        ALTER TABLE orders ADD COLUMN balance_paid_inr INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMPTZ;
        ALTER TABLE orders ADD COLUMN razorpay_balance_order_id TEXT;
        ALTER TABLE orders ADD COLUMN razorpay_balance_payment_id TEXT;
        ALTER TABLE orders ADD COLUMN balance_paid_at TIMESTAMPTZ;
        ALTER TABLE orders ADD COLUMN completed_at TIMESTAMPTZ;
      END IF;
    END $$;
        """
    )

    execute(
        """
    UPDATE orders
    SET status = 'advance_paid',
        advance_paid_inr = amount_inr
    WHERE status = 'paid' AND advance_paid_inr IS NULL
        """
    )

    execute(
        """
    CREATE INDEX IF NOT EXISTS idx_orders_balance_razorpay ON orders(razorpay_balance_order_id)
        """
    )


_init_done = False


def init_db() -> None:
    global _init_done
    if _init_done:
        return
    migrate()
    _init_done = True

