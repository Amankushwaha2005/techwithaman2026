/**
 * =============================================================================
 * BACKEND — forms controller
 * File: src/controllers/forms.controller.js
 * Contact, work, chatbot form handlers
 * =============================================================================
 */

const { query } = require("../services/db");
const { validateFormRecaptcha } = require("../services/recaptcha.service");

async function contact(req, res) {
  const captcha = await validateFormRecaptcha(req);
  if (!captcha.ok) {
    return res.redirect("/contact?error=" + encodeURIComponent(captcha.error));
  }

  const { name, email, phone, message } = req.body || {};
  const n = String(name || "").trim();
  const em = String(email || "").trim().toLowerCase();
  const msg = String(message || "").trim();

  if (!n || !em || !msg) {
    return res.redirect("/contact?error=" + encodeURIComponent("Please fill name, email, and message."));
  }

  await query(
    `INSERT INTO contact_submissions (name, email, phone, message)
     VALUES ($1, $2, $3, $4)`,
    [n, em, String(phone || "").trim() || null, msg],
  );

  res.redirect("/contact?sent=1");
}

async function work(req, res) {
  const captcha = await validateFormRecaptcha(req);
  if (!captcha.ok) {
    return res.redirect("/work?error=" + encodeURIComponent(captcha.error));
  }

  const { fullName, email, phone, resume, category, skill } = req.body || {};
  const fn = String(fullName || "").trim();
  const em = String(email || "").trim().toLowerCase();
  const cat = String(category || "").trim();
  const sk = String(skill || "").trim();

  if (!fn || !em) {
    return res.redirect("/work?error=" + encodeURIComponent("Name and email are required."));
  }
  if (!cat || !sk) {
    return res.redirect("/work?error=" + encodeURIComponent("Please select category and role."));
  }

  const skillLabel = `${cat} — ${sk}`;

  await query(
    `INSERT INTO work_submissions (full_name, email, phone, resume, skill)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      fn,
      em,
      String(phone || "").trim() || null,
      String(resume || "").trim() || null,
      skillLabel,
    ],
  );

  res.redirect("/work?sent=1");
}

async function chatbotMessage(req, res) {
  const msg = String(req.body?.message || "").trim();
  if (!msg) {
    return res.status(400).json({ ok: false, error: "Message is required." });
  }

  const pageUrl = String(req.body?.page || req.get("referer") || "").trim().slice(0, 500) || null;

  await query(`INSERT INTO chat_messages (message, page_url) VALUES ($1, $2)`, [msg, pageUrl]);

  return res.json({ ok: true });
}

module.exports = { contact, work, chatbotMessage };
