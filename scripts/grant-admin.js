#!/usr/bin/env node
/**
 * Promote a user to admin by email (updates DB role).
 * Usage: npm run grant-admin -- you@email.com
 */
require("dotenv").config();
const { initDb, query, queryOne, getPool } = require("../src/services/db");

const emailArg = process.argv[2];

async function main() {
  if (!emailArg) {
    console.error("Usage: npm run grant-admin -- <email>");
    console.error("Example: npm run grant-admin -- aman@gmail.com");
    process.exit(1);
  }

  await initDb();
  const normalized = String(emailArg).trim().toLowerCase();

  const row = await queryOne("SELECT id, email, role FROM users WHERE lower(email) = $1", [
    normalized,
  ]);
  if (!row) {
    console.error(`No user with email: ${normalized}`);
    console.error("Sign up / login once first, then run this command again.");
    process.exit(1);
  }

  await query("UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1", [row.id]);
  const updated = await queryOne("SELECT id, email, role FROM users WHERE id = $1", [row.id]);
  console.log("Admin granted:", updated);
  await getPool().end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
