function getRazorpayKeyId() {
  return (process.env.RAZORPAY_KEY_ID || "").trim();
}

function getRazorpayKeySecret() {
  return (process.env.RAZORPAY_KEY_SECRET || "").trim();
}

function isPaymentEnabled() {
  return !!(getRazorpayKeyId() && getRazorpayKeySecret());
}

function getAdvancePercent() {
  const n = parseInt(process.env.PAYMENT_ADVANCE_PERCENT || "50", 10);
  if (!Number.isFinite(n) || n < 1 || n > 100) return 50;
  return n;
}

function computeAdvanceInr(totalInr, percent = getAdvancePercent()) {
  const total = Math.max(0, Math.floor(Number(totalInr) || 0));
  if (total <= 0) return 0;
  return Math.max(1, Math.round((total * percent) / 100));
}

function isLiveRazorpayKey() {
  return getRazorpayKeyId().startsWith("rzp_live_");
}

function isLocalPaymentHost() {
  const base = (process.env.BASE_URL || "").toLowerCase();
  return (
    !base ||
    base.includes("localhost") ||
    base.includes("127.0.0.1") ||
    base.includes("0.0.0.0")
  );
}

/** Live keys on localhost are blocked by Razorpay (unregistered domain). */
function isLiveKeyOnLocalhost() {
  return isPaymentEnabled() && isLiveRazorpayKey() && isLocalPaymentHost();
}

function getWebhookSecret() {
  return (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
}

module.exports = {
  getRazorpayKeyId,
  getRazorpayKeySecret,
  isPaymentEnabled,
  getAdvancePercent,
  computeAdvanceInr,
  isLiveRazorpayKey,
  isLocalPaymentHost,
  isLiveKeyOnLocalhost,
  getWebhookSecret,
};
