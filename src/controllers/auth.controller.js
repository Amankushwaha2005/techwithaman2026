const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const { db } = require("../services/db");

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function getBaseUrl(req) {
  return process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function getGoogleConfig(req) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${getBaseUrl(req)}/auth/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

function loginError(res, message) {
  return res.redirect(`/login?error=${encodeURIComponent(message)}`);
}

function login(req, res) {
  const { email, password } = req.body || {};
  console.log("LOGIN request:", { email });

  if (!email || !password) return loginError(res, "Email and password are required.");

  const user = db
    .prepare(
      `SELECT id, provider, name, email, password_hash, picture
       FROM users
       WHERE email = ?`,
    )
    .get(String(email).trim().toLowerCase());

  if (!user || !user.password_hash) return loginError(res, "Invalid email or password.");
  const ok = bcrypt.compareSync(String(password), user.password_hash);
  if (!ok) return loginError(res, "Invalid email or password.");

  req.session.userId = user.id;
  const next = req.body?.next;
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return res.redirect(next);
  }
  return res.redirect("/");
}

function signup(req, res) {
  const { name, email, password } = req.body || {};
  console.log("SIGNUP request:", { name, email });

  if (!name || !email || !password) return loginError(res, "Name, email and password are required.");

  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (exists) return loginError(res, "Email already exists. Please login.");

  const passwordHash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare(
      `INSERT INTO users (provider, name, email, password_hash)
       VALUES ('local', ?, ?, ?)`,
    )
    .run(String(name).trim(), normalizedEmail, passwordHash);

  req.session.userId = info.lastInsertRowid;
  const next = req.body?.next;
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return res.redirect(next);
  }
  return res.redirect("/");
}

function googleAuth(req, res) {
  const { clientId, redirectUri } = getGoogleConfig(req);
  if (!clientId) return loginError(res, "Google login is not configured yet.");

  const state = crypto.randomBytes(24).toString("hex");
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  return res.redirect(`${GOOGLE_AUTH_BASE}?${params.toString()}`);
}

async function googleCallback(req, res) {
  const { code, state } = req.query || {};
  if (!code || !state || state !== req.session.oauthState) {
    return loginError(res, "Google login failed. Please try again.");
  }

  delete req.session.oauthState;

  const { clientId, clientSecret, redirectUri } = getGoogleConfig(req);
  if (!clientId || !clientSecret) {
    return loginError(res, "Google login is not configured yet.");
  }

  try {
    const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResp.ok) return loginError(res, "Could not verify Google account.");
    const tokenJson = await tokenResp.json();
    if (!tokenJson.access_token) return loginError(res, "Google access token missing.");

    const profileResp = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!profileResp.ok) return loginError(res, "Could not fetch Google profile.");

    const profile = await profileResp.json();
    const email = String(profile.email || "").trim().toLowerCase();
    if (!email) return loginError(res, "Google account email not available.");

    const providerId = String(profile.sub || "");
    const name = profile.name || profile.given_name || "User";
    const picture = profile.picture || "";

    let user = db
      .prepare(
        `SELECT id, provider, provider_id, name, email, picture
         FROM users
         WHERE email = ?`,
      )
      .get(email);

    if (!user) {
      const insert = db
        .prepare(
          `INSERT INTO users (provider, provider_id, name, email, picture)
           VALUES ('google', ?, ?, ?, ?)`,
        )
        .run(providerId || null, name, email, picture);
      req.session.userId = insert.lastInsertRowid;
    } else {
      db.prepare(
        `UPDATE users
         SET provider = 'google',
             provider_id = COALESCE(?, provider_id),
             name = ?,
             picture = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
      ).run(providerId || null, name, picture, user.id);

      req.session.userId = user.id;
    }

    const next = req.session.afterLoginRedirect;
    delete req.session.afterLoginRedirect;
    if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
      return res.redirect(next);
    }
    return res.redirect("/");
  } catch (error) {
    console.error("Google OAuth error:", error);
    return loginError(res, "Google login failed. Please try again.");
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("techwithaman.sid");
    res.redirect("/");
  });
}

module.exports = { login, signup, googleAuth, googleCallback, logout };

