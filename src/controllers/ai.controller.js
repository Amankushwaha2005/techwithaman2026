/**
 * =============================================================================
 * BACKEND — AI controller
 * File: src/controllers/ai.controller.js
 * AI chat API endpoint handler
 * =============================================================================
 */

const { getAssistantReply } = require("../services/ai-assistant");

const hits = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 40;

function rateLimit(ip) {
  const now = Date.now();
  let row = hits.get(ip);
  if (!row || now > row.reset) {
    row = { count: 0, reset: now + WINDOW_MS };
    hits.set(ip, row);
  }
  row.count += 1;
  return row.count <= MAX_PER_WINDOW;
}

async function chat(req, res) {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  if (!rateLimit(ip)) {
    return res.status(429).json({ ok: false, error: "Too many messages. Please wait a while." });
  }

  const message = String(req.body?.message || "").trim();
  if (!message) {
    return res.status(400).json({ ok: false, error: "Message is required." });
  }

  if (message.length > 2000) {
    return res.status(400).json({ ok: false, error: "Message is too long." });
  }

  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const safeHistory = history
    .filter((h) => h && (h.role === "user" || h.role === "assistant") && h.content)
    .slice(-10);

  try {
    const { reply, mode } = await getAssistantReply(message, safeHistory);
    return res.json({
      ok: true,
      reply,
      mode,
      aiEnabled: !!process.env.OPENAI_API_KEY?.trim(),
      smart: mode === "openai",
    });
  } catch (err) {
    console.error("[ai] chat error", err);
    return res.status(500).json({ ok: false, error: "Could not get a reply. Try again." });
  }
}

function status(req, res) {
  res.json({
    ok: true,
    aiEnabled: !!process.env.OPENAI_API_KEY?.trim(),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
  });
}

module.exports = { chat, status };
