const { brand, navItems } = require("../config/site");
const {
  isPaymentEnabled,
  getRazorpayKeyId,
  getAdvancePercent,
  isLiveKeyOnLocalhost,
} = require("../config/payments");
const paymentsService = require("../services/payments.service");

function renderWithLayout(res, view, page, extra = {}) {
  res.render(view, {
    page,
    navItems,
    brand,
    year: new Date().getFullYear(),
    authUser: res.locals.authUser || null,
    isAdmin: !!res.locals.isAdmin,
    googleLoginEnabled: !!res.locals.googleLoginEnabled,
    paymentEnabled: isPaymentEnabled(),
    paymentAdvancePercent: getAdvancePercent(),
    razorpayKeyId: getRazorpayKeyId(),
    paymentLiveOnLocalhost: isLiveKeyOnLocalhost(),
    ...extra,
  });
}

function showOrder(req, res) {
  const q = req.query || {};
  const totalInr = Math.floor(Number(q.total) || 0);
  const amountInr =
    totalInr > 0
      ? paymentsService.computeAdvanceInr(totalInr)
      : Math.floor(Number(q.amount) || 0);

  renderWithLayout(res, "pages/order", { key: "order", title: "Place Order & Pay | #TechWithAman" }, {
    orderPrefill: {
      service: typeof q.service === "string" ? q.service : "",
      plan: typeof q.plan === "string" ? q.plan : "",
      total_inr: totalInr,
      amount_inr: amountInr,
    },
  });
}

function showOrderSuccess(req, res) {
  const id = typeof req.query.id === "string" ? req.query.id : "";
  const order = id ? paymentsService.getOrderByPublicId(id) : null;

  renderWithLayout(
    res,
    "pages/order-success",
    { key: "order-success", title: "Order Confirmed | #TechWithAman" },
    { order },
  );
}

async function createOrder(req, res) {
  try {
    const { name, email, phone, service, plan, notes, total_inr } = req.body || {};

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ ok: false, error: "Name and email are required." });
    }
    if (!service?.trim() || !plan?.trim()) {
      return res.status(400).json({ ok: false, error: "Service and plan are required." });
    }

    const result = await paymentsService.createPaymentOrder({
      name,
      email,
      phone,
      service,
      plan,
      notes,
      total_inr,
    });

    if (!result.paymentConfigured) {
      return res.status(503).json({
        ok: false,
        error: result.message,
        publicId: result.order.public_id,
        amountInr: result.order.amount_inr,
      });
    }

    return res.json({
      ok: true,
      publicId: result.order.public_id,
      razorpayOrderId: result.razorpayOrderId,
      amountPaise: result.amountPaise,
      amountInr: result.order.amount_inr,
      keyId: result.keyId,
      customer: {
        name: result.order.name,
        email: result.order.email,
        contact: result.order.phone || "",
      },
      description: `${result.order.service} — ${result.order.plan} (advance)`,
    });
  } catch (err) {
    console.error("[payments] create-order", err);
    return res.status(500).json({ ok: false, error: err.message || "Could not create order." });
  }
}

async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ ok: false, error: "Missing payment details." });
    }

    const { order, alreadyPaid } = paymentsService.completePayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    return res.json({
      ok: true,
      alreadyPaid,
      publicId: order.public_id,
      redirectUrl: `/order/success?id=${encodeURIComponent(order.public_id)}`,
    });
  } catch (err) {
    console.error("[payments] verify", err);
    return res.status(400).json({ ok: false, error: err.message || "Payment verification failed." });
  }
}

async function paymentStatus(req, res) {
  try {
    const publicId =
      typeof req.query.publicId === "string"
        ? req.query.publicId
        : typeof req.body?.publicId === "string"
          ? req.body.publicId
          : "";
    if (!publicId) {
      return res.status(400).json({ ok: false, error: "Order reference required." });
    }

    const result = await paymentsService.checkOrderPaymentStatus(publicId);
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[payments] status", err);
    return res.status(500).json({ ok: false, error: err.message || "Could not check payment." });
  }
}

async function razorpayWebhook(req, res) {
  try {
    const signature = req.get("x-razorpay-signature") || "";
    const rawBody = req.body;

    if (!Buffer.isBuffer(rawBody)) {
      return res.status(400).json({ ok: false, error: "Invalid webhook body." });
    }

    if (!paymentsService.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ ok: false, error: "Invalid webhook signature." });
    }

    const payload = JSON.parse(rawBody.toString("utf8"));
    await paymentsService.handleWebhookEvent(payload);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[payments] webhook", err);
    return res.status(500).json({ ok: false });
  }
}

module.exports = {
  showOrder,
  showOrderSuccess,
  createOrder,
  verifyPayment,
  paymentStatus,
  razorpayWebhook,
};
