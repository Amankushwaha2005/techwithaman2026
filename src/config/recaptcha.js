const TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXJiZQyJ";
const TEST_SECRET_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

function getRecaptchaSiteKey() {
  const key = process.env.RECAPTCHA_SITE_KEY?.trim();
  if (key) return key;
  if (process.env.NODE_ENV !== "production") return TEST_SITE_KEY;
  return "";
}

function getRecaptchaSecretKey() {
  const key = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (key) return key;
  if (process.env.NODE_ENV !== "production") return TEST_SECRET_KEY;
  return "";
}

function isRecaptchaConfigured() {
  return Boolean(process.env.RECAPTCHA_SITE_KEY?.trim() && process.env.RECAPTCHA_SECRET_KEY?.trim());
}

function isRecaptchaEnabled() {
  return Boolean(getRecaptchaSiteKey() && getRecaptchaSecretKey());
}

module.exports = {
  getRecaptchaSiteKey,
  getRecaptchaSecretKey,
  isRecaptchaConfigured,
  isRecaptchaEnabled,
};
