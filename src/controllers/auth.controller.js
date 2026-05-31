/**
 * =============================================================================
 * BACKEND — auth controller
 * File: src/controllers/auth.controller.js
 * Login, signup, Google OAuth, logout
 * =============================================================================
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const { query, queryOne } = require("../services/db");
const { validateFormRecaptcha } = require("../services/recaptcha.service");

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function getBaseUrl(req) {
  return process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function getGoogleConfig(req) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const baseUrl = (process.env.BASE_URL || getBaseUrl(req)).replace(/\/$/, "");
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() || `${baseUrl}/auth/google/callback`;
  return { clientId, clientSecret, redirectUri, baseUrl };
}

function isGoogleOAuthReady() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

function authError(res, message, returnTo = "login") {
  const base = returnTo === "signup" ? "/signup" : "/login";
  return res.redirect(`${base}?error=${encodeURIComponent(message)}`);
}

function loginError(res, message) {
  return authError(res, message, "login");
}

function signupError(res, message) {
  return authError(res, message, "signup");
}

async function login(req, res) {
  const captcha = await validateFormRecaptcha(req);
  if (!captcha.ok) return loginError(res, captcha.error);

  const { email, password } = req.body || {};
  console.log("LOGIN request:", { email });

  if (!email || !password) return loginError(res, "Email and password are required.");

  const user = await queryOne(
    `SELECT id, provider, name, email, password_hash, picture
     FROM users
     WHERE email = $1`,
    [String(email).trim().toLowerCase()],
  );

  if (!user || !user.password_hash) return loginError(res, "Invalid email or password.");
  const ok = bcrypt.compareSync(String(password), user.password_hash);
  if (!ok) return loginError(res, "Invalid email or password.");

  req.session.userId = user.id;
  const next = req.body?.next;
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    const sep = next.includes("?") ? "&" : "?";
    return res.redirect(`${next}${sep}toast=login`);
  }
  return res.redirect("/?toast=login");
}

async function signup(req, res) {
  const captcha = await validateFormRecaptcha(req);
  if (!captcha.ok) return signupError(res, captcha.error);

  const { name, email, password } = req.body || {};
  console.log("SIGNUP request:", { name, email });

  if (!name || !email || !password) return signupError(res, "Name, email and password are required.");

  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = await queryOne("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
  if (exists) return signupError(res, "Email already exists. Please login.");

  const passwordHash = bcrypt.hashSync(String(password), 10);
  const inserted = await queryOne(
    `INSERT INTO users (provider, name, email, password_hash)
     VALUES ('local', $1, $2, $3)
     RETURNING id`,
    [String(name).trim(), normalizedEmail, passwordHash],
  );

  req.session.userId = inserted.id;
  const next = req.body?.next;
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    const sep = next.includes("?") ? "&" : "?";
    return res.redirect(`${next}${sep}toast=signup`);
  }
  return res.redirect("/?toast=signup");
}

function googleAuth(req, res) {
  const from = req.query.from === "signup" ? "signup" : "login";
  req.session.oauthReturnTo = from;

  const { clientId, clientSecret, redirectUri } = getGoogleConfig(req);
  if (!clientId || !clientSecret) {
    return authError(
      res,
      "Google (Gmail) login is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Render, then redeploy.",
      from,
    );
  }

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
  const returnTo = req.session.oauthReturnTo === "signup" ? "signup" : "login";
  const { code, state } = req.query || {};
  if (!code || !state || state !== req.session.oauthState) {
    return authError(res, "Google login failed. Please try again.", returnTo);
  }

  delete req.session.oauthState;
  delete req.session.oauthReturnTo;

  const { clientId, clientSecret, redirectUri } = getGoogleConfig(req);
  if (!clientId || !clientSecret) {
    return authError(res, "Google login is not configured yet.", returnTo);
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

    if (!tokenResp.ok) {
      const errBody = await tokenResp.text().catch(() => "");
      console.error("[google] token error", tokenResp.status, errBody);
      return authError(res, "Could not verify Google account. Check redirect URI in Google Cloud.", returnTo);
    }
    const tokenJson = await tokenResp.json();
    if (!tokenJson.access_token) return authError(res, "Google access token missing.", returnTo);

    const profileResp = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!profileResp.ok) return authError(res, "Could not fetch Google profile.", returnTo);

    const profile = await profileResp.json();
    const email = String(profile.email || "").trim().toLowerCase();
    if (!email) return authError(res, "Google account email not available.", returnTo);

    const providerId = String(profile.sub || "");
    const name = profile.name || profile.given_name || "User";
    const picture = profile.picture || "";

    let user = await queryOne(
      `SELECT id, provider, provider_id, name, email, picture
       FROM users
       WHERE email = $1`,
      [email],
    );

    if (!user) {
      const inserted = await queryOne(
        `INSERT INTO users (provider, provider_id, name, email, picture)
         VALUES ('google', $1, $2, $3, $4)
         RETURNING id`,
        [providerId || null, name, email, picture],
      );
      req.session.userId = inserted.id;
    } else {
      await query(
        `UPDATE users
         SET provider = 'google',
             provider_id = COALESCE($1, provider_id),
             name = $2,
             picture = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [providerId || null, name, picture, user.id],
      );

      req.session.userId = user.id;
    }

    const next = req.session.afterLoginRedirect;
    delete req.session.afterLoginRedirect;
    if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
      const sep = next.includes("?") ? "&" : "?";
      return res.redirect(`${next}${sep}toast=${returnTo === "signup" ? "signup" : "login"}`);
    }
    return res.redirect(`/?toast=${returnTo === "signup" ? "signup" : "login"}`);
  } catch (error) {
    console.error("Google OAuth error:", error);
    return authError(res, "Google login failed. Please try again.", returnTo);
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("techwithaman.sid");
    res.redirect("/");
  });
}

module.exports = { login, signup, googleAuth, googleCallback, logout, isGoogleOAuthReady };
