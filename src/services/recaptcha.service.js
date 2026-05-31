const {
  getRecaptchaSecretKey,
  isRecaptchaEnabled,
  isRecaptchaConfigured,
} = require("../config/recaptcha");

async function verifyRecaptcha(token, remoteIp) {
  if (!isRecaptchaEnabled()) {
    return { ok: false, error: "reCAPTCHA is not configured on the server." };
  }

  if (!token) {
    return { ok: false, error: "Please complete the \"I'm not a robot\" check." };
  }

  const secret = getRecaptchaSecretKey();
  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await resp.json();
    if (!data.success) {
      return { ok: false, error: "reCAPTCHA verification failed. Please try again." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[recaptcha]", err.message);
    return { ok: false, error: "Could not verify reCAPTCHA. Please try again." };
  }
}

async function validateFormRecaptcha(req) {
  if (isRecaptchaEnabled()) {
    const token = req.body?.["g-recaptcha-response"];
    const remoteIp = req.ip || req.connection?.remoteAddress;
    return verifyRecaptcha(token, remoteIp);
  }

  if (req.body?.humanCheck === "on" || req.body?.humanCheck === "1") {
    return { ok: true };
  }

  if (!isRecaptchaConfigured()) {
    return {
      ok: false,
      error: "Please confirm you are not a robot.",
    };
  }

  return { ok: false, error: "reCAPTCHA is not configured. Add RECAPTCHA_SITE_KEY and RECAPTCHA_SECRET_KEY." };
}

module.exports = { verifyRecaptcha, validateFormRecaptcha };
