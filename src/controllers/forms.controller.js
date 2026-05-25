const { db } = require("../services/db");

function contact(req, res) {
  const { name, email, phone, message } = req.body || {};
  const n = String(name || "").trim();
  const em = String(email || "").trim().toLowerCase();
  const msg = String(message || "").trim();

  if (!n || !em || !msg) {
    return res.redirect("/contact?error=" + encodeURIComponent("Please fill name, email, and message."));
  }

  db.prepare(
    `INSERT INTO contact_submissions (name, email, phone, message)
     VALUES (?, ?, ?, ?)`,
  ).run(n, em, String(phone || "").trim() || null, msg);

  res.redirect("/contact?sent=1");
}

function work(req, res) {
  const { fullName, email, phone, resume, skill } = req.body || {};
  const fn = String(fullName || "").trim();
  const em = String(email || "").trim().toLowerCase();

  if (!fn || !em) {
    return res.redirect("/work?error=" + encodeURIComponent("Name and email are required."));
  }

  db.prepare(
    `INSERT INTO work_submissions (full_name, email, phone, resume, skill)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    fn,
    em,
    String(phone || "").trim() || null,
    String(resume || "").trim() || null,
    String(skill || "").trim() || null,
  );

  res.redirect("/work?sent=1");
}

function chatbotMessage(req, res) {
  const msg = String(req.body?.message || "").trim();
  if (!msg) {
    return res.status(400).json({ ok: false, error: "Message is required." });
  }

  const pageUrl = String(req.body?.page || req.get("referer") || "").trim().slice(0, 500) || null;

  db.prepare(`INSERT INTO chat_messages (message, page_url) VALUES (?, ?)`).run(msg, pageUrl);

  return res.json({ ok: true });
}

module.exports = { contact, work, chatbotMessage };

