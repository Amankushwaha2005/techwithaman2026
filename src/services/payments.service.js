const crypto = require("crypto");

const Razorpay = require("razorpay");

const { db } = require("./db");
const {
  getRazorpayKeyId,
  getRazorpayKeySecret,
  isPaymentEnabled,
  getAdvancePercent,
  computeAdvanceInr,
} = require("../config/payments");

function createPublicId() {
  return `TW${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
}

function getRazorpayClient() {
  if (!isPaymentEnabled()) return null;
  return new Razorpay({
    key_id: getRazorpayKeyId(),
    key_secret: getRazorpayKeySecret(),
  });
}

function insertOrder(row) {
  const stmt = db.prepare(`
    INSERT INTO orders (
      public_id, name, email, phone, service, plan, notes,
      total_inr, amount_inr, advance_percent, status
    ) VALUES (
      @public_id, @name, @email, @phone, @service, @plan, @notes,
      @total_inr, @amount_inr, @advance_percent, 'pending'
    )
  `);
  const info = stmt.run(row);
  return db.prepare(`SELECT * FROM orders WHERE id = ?`).get(info.lastInsertRowid);
}

function getOrderByPublicId(publicId) {
  return db.prepare(`SELECT * FROM orders WHERE public_id = ?`).get(publicId);
}

function getOrderByRazorpayOrderId(razorpayOrderId) {
  return db.prepare(`SELECT * FROM orders WHERE razorpay_order_id = ?`).get(razorpayOrderId);
}

async function createPaymentOrder(payload) {
  const totalInr = Math.floor(Number(payload.total_inr) || 0);
  if (totalInr < 1) {
    throw new Error("Invalid package total. Choose a plan from Pricing.");
  }

  const advancePercent = getAdvancePercent();
  const amountInr = computeAdvanceInr(totalInr, advancePercent);
  const amountPaise = amountInr * 100;

  const publicId = createPublicId();
  const orderRow = insertOrder({
    public_id: publicId,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: (payload.phone || "").trim() || null,
    service: payload.service.trim(),
    plan: payload.plan.trim(),
    notes: (payload.notes || "").trim() || null,
    total_inr: totalInr,
    amount_inr: amountInr,
    advance_percent: advancePercent,
  });

  if (!isPaymentEnabled()) {
    return {
      order: orderRow,
      paymentConfigured: false,
      message:
        "Online payment is not configured yet. Contact us on WhatsApp to pay advance and confirm your order.",
    };
  }

  const razorpay = getRazorpayClient();
  const rzOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: publicId,
    notes: {
      service: orderRow.service,
      plan: orderRow.plan,
      public_id: publicId,
    },
  });

  db.prepare(
    `UPDATE orders SET razorpay_order_id = ? WHERE id = ?`,
  ).run(rzOrder.id, orderRow.id);

  const updated = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderRow.id);

  return {
    order: updated,
    paymentConfigured: true,
    razorpayOrderId: rzOrder.id,
    amountPaise,
    keyId: getRazorpayKeyId(),
  };
}

function verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, signature) {
  const secret = getRazorpayKeySecret();
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

function markOrderPaid(orderId, razorpayPaymentId) {
  db.prepare(
    `UPDATE orders
     SET status = 'paid',
         razorpay_payment_id = ?,
         paid_at = datetime('now')
     WHERE id = ?`,
  ).run(razorpayPaymentId, orderId);
  return db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId);
}

function completePayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!isPaymentEnabled()) {
    throw new Error("Payment gateway is not configured.");
  }

  const order = getOrderByRazorpayOrderId(razorpay_order_id);
  if (!order) throw new Error("Order not found.");
  if (order.status === "paid") {
    return { order, alreadyPaid: true };
  }

  if (razorpay_signature) {
    const ok = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );
    if (!ok) throw new Error("Payment verification failed.");
  }

  const paid = markOrderPaid(order.id, razorpay_payment_id);
  return { order: paid, alreadyPaid: false };
}

async function syncCapturedPaymentForOrder(razorpayOrderId) {
  const razorpay = getRazorpayClient();
  if (!razorpay) return null;

  const order = getOrderByRazorpayOrderId(razorpayOrderId);
  if (!order) return null;
  if (order.status === "paid") return order;

  const expectedPaise = order.amount_inr * 100;
  const list = await razorpay.orders.fetchPayments(razorpayOrderId);
  const items = list?.items || [];

  const captured = items.find(
    (p) =>
      (p.status === "captured" || p.status === "authorized") &&
      Number(p.amount) === expectedPaise,
  );
  if (!captured) return null;

  return markOrderPaid(order.id, captured.id);
}

async function checkOrderPaymentStatus(publicId) {
  const order = getOrderByPublicId(publicId);
  if (!order) {
    return { status: "not_found" };
  }
  if (order.status === "paid") {
    return {
      status: "paid",
      publicId: order.public_id,
      redirectUrl: `/order/success?id=${encodeURIComponent(order.public_id)}`,
    };
  }
  if (!order.razorpay_order_id || !isPaymentEnabled()) {
    return { status: "pending", publicId: order.public_id };
  }

  try {
    const synced = await syncCapturedPaymentForOrder(order.razorpay_order_id);
    if (synced && synced.status === "paid") {
      return {
        status: "paid",
        publicId: synced.public_id,
        redirectUrl: `/order/success?id=${encodeURIComponent(synced.public_id)}`,
      };
    }
  } catch (err) {
    console.error("[payments] sync status", err.message);
  }

  return { status: "pending", publicId: order.public_id };
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

async function handleWebhookEvent(payload) {
  const event = payload?.event;
  const entity =
    payload?.payload?.payment?.entity || payload?.payload?.order?.entity;

  if (!entity) return { handled: false };

  if (event === "payment.captured" || event === "payment.authorized") {
    const razorpayOrderId = entity.order_id;
    if (!razorpayOrderId) return { handled: false };
    const order = await syncCapturedPaymentForOrder(razorpayOrderId);
    return { handled: !!order, order };
  }

  return { handled: false };
}

module.exports = {
  createPaymentOrder,
  completePayment,
  getOrderByPublicId,
  computeAdvanceInr,
  getAdvancePercent,
  syncCapturedPaymentForOrder,
  checkOrderPaymentStatus,
  verifyWebhookSignature,
  handleWebhookEvent,
};
