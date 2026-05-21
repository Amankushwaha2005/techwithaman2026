#!/usr/bin/env node
/**
 * Promote a user to admin by email (updates DB role).
 * Usage: npm run grant-admin -- you@email.com
 */
require("dotenv").config();
const path = require("path");
const Database = require("better-sqlite3");

const emailArg = process.argv[2];
if (!emailArg) {
  console.error("Usage: npm run grant-admin -- <email>");
  console.error("Example: npm run grant-admin -- aman@gmail.com");
  process.exit(1);
}

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "app.sqlite");
const db = new Database(dbPath);
const normalized = String(emailArg).trim().toLowerCase();

const row = db.prepare("SELECT id, email, role FROM users WHERE lower(email) = ?").get(normalized);
if (!row) {
  console.error(`No user with email: ${normalized}`);
  console.error("Sign up / login once first, then run this command again.");
  process.exit(1);
}

db.prepare("UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE id = ?").run(row.id);
const updated = db.prepare("SELECT id, email, role FROM users WHERE id = ?").get(row.id);
console.log("Admin granted:", updated);
