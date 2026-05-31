/**
 * =============================================================================
 * BACKEND — payments service
 * File: src/services/payments.service.js
 * Orders CRUD, Razorpay create/verify (advance + balance)
 * =============================================================================
 */

const crypto = require("crypto");

const Razorpay = require("razorpay");

const { query, queryOne } = require("./db");
const {
  getRazorpayKeyId,
  getRazorpayKeySecret,
  isPaymentEnabled,
  getAdvancePercent,
  computeAdvanceInr,
} = require("../config/payments");
const {
  normalizeOrderStatus,
  getAdvancePaidInr,
  getBalancePaidInr,
  getBalanceDue,
  canPayBalance,
} = require("./order-payment.helpers");

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

async function insertOrder(row) {
  return queryOne(
    `
    INSERT INTO orders (
      public_id, name, email, phone, service, plan, notes,
      total_inr, amount_inr, advance_percent, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, 'pending'
    )
    RETURNING *
  `,
    [
      row.public_id,
      row.name,
      row.email,
      row.phone,
      row.service,
      row.plan,
      row.notes,
      row.total_inr,
      row.amount_inr,
      row.advance_percent,
    ],
  );
}

async function getOrderByPublicId(publicId) {
  return queryOne(`SELECT * FROM orders WHERE public_id = $1`, [publicId]);
}

async function getOrderByRazorpayOrderId(razorpayOrderId) {
  return queryOne(`SELECT * FROM orders WHERE razorpay_order_id = $1`, [razorpayOrderId]);
}

async function getOrderByRazorpayBalanceOrderId(razorpayOrderId) {
  return queryOne(`SELECT * FROM orders WHERE razorpay_balance_order_id = $1`, [razorpayOrderId]);
}

function formatReceiptDate(value) {
  if (!value) {
    return new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  const normalized = String(value).includes("T") ? value : String(value).replace(" ", "T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function buildReceiptData(order, phase = "advance") {
  if (!order) return null;

  const isBalance = phase === "balance";
  const amountInr = isBalance ? getBalancePaidInr(order) || getBalanceDue(order) : getAdvancePaidInr(order);
  const paymentId = isBalance ? order.razorpay_balance_payment_id : order.razorpay_payment_id;
  const paidAt = isBalance ? order.balance_paid_at : order.paid_at;
  const gateway = paymentId ? "Razorpay" : "Manual / WhatsApp";
  const transactionNo = paymentId || order.public_id;

  return {
    payeeName: order.name,
    status: "Success",
    paymentDate: formatReceiptDate(paidAt || order.created_at),
    transactionNo,
    gateway,
    paymentId: paymentId || "—",
    amountInr,
    amountFormatted: `₹${Number(amountInr).toLocaleString("en-IN")}`,
    orderId: order.public_id,
    service: order.service,
    plan: order.plan,
    email: order.email,
    phone: order.phone || "—",
    totalInr: order.total_inr,
    totalFormatted: `₹${Number(order.total_inr).toLocaleString("en-IN")}`,
    receiptTitle: isBalance ? "BALANCE PAYMENT RECEIPT" : "ADVANCE PAYMENT RECEIPT",
    phase: isBalance ? "balance" : "advance",
  };
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
  const orderRow = await insertOrder({
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
      phase: "advance",
    },
  });

  const updated = await queryOne(
    `UPDATE orders SET razorpay_order_id = $1 WHERE id = $2 RETURNING *`,
    [rzOrder.id, orderRow.id],
  );

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

async function markAdvancePaid(orderId, razorpayPaymentId) {
  return queryOne(
    `UPDATE orders
     SET status = 'advance_paid',
         razorpay_payment_id = $1,
         paid_at = NOW(),
         advance_paid_inr = amount_inr
     WHERE id = $2
     RETURNING *`,
    [razorpayPaymentId, orderId],
  );
}

async function markBalancePaid(orderId, razorpayPaymentId) {
  const order = await queryOne(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (!order) return null;
  const balanceAmount = getBalanceDue(order);

  return queryOne(
    `UPDATE orders
     SET status = 'completed',
         balance_paid_inr = $1,
         razorpay_balance_payment_id = $2,
         balance_paid_at = NOW(),
         completed_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [balanceAmount, razorpayPaymentId, orderId],
  );
}

async function markOrderDelivered(orderId) {
  return queryOne(
    `UPDATE orders SET delivered_at = NOW() WHERE id = $1 RETURNING *`,
    [orderId],
  );
}

async function markAdvancePaidManual(orderId) {
  return queryOne(
    `UPDATE orders
     SET status = 'advance_paid',
         paid_at = NOW(),
         advance_paid_inr = amount_inr,
         razorpay_payment_id = COALESCE(NULLIF(razorpay_payment_id, ''), 'manual')
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [orderId],
  );
}

async function deleteOrderById(orderId) {
  return queryOne(`DELETE FROM orders WHERE id = $1 RETURNING id`, [orderId]);
}

async function resumeAdvancePaymentOrder(publicId) {
  const order = await getOrderByPublicId(publicId);
  if (!order) throw new Error("Order not found.");
  if (normalizeOrderStatus(order) !== "pending") {
    throw new Error("Advance is already paid for this order.");
  }

  if (!isPaymentEnabled()) {
    return {
      order,
      paymentConfigured: false,
      message: "Online payment is not configured. Contact us on WhatsApp to pay advance.",
    };
  }

  const amountPaise = order.amount_inr * 100;
  let razorpayOrderId = order.razorpay_order_id;

  if (!razorpayOrderId) {
    const razorpay = getRazorpayClient();
    const rzOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: order.public_id.slice(0, 40),
      notes: {
        public_id: order.public_id,
        phase: "advance",
        service: order.service,
        plan: order.plan,
      },
    });
    razorpayOrderId = rzOrder.id;
    await queryOne(
      `UPDATE orders SET razorpay_order_id = $1 WHERE id = $2 RETURNING *`,
      [razorpayOrderId, order.id],
    );
  }

  return {
    order,
    paymentConfigured: true,
    razorpayOrderId,
    amountPaise,
    amountInr: order.amount_inr,
    keyId: getRazorpayKeyId(),
  };
}

async function syncOrderAdvanceById(orderId) {
  const order = await queryOne(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  if (!order) return { synced: false, reason: "not_found" };
  if (normalizeOrderStatus(order) !== "pending") {
    return { synced: false, reason: "already_paid", order };
  }
  if (!order.razorpay_order_id) {
    return { synced: false, reason: "no_razorpay", order };
  }

  const updated = await syncAdvancePaymentForOrder(order.razorpay_order_id);
  return {
    synced: !!(updated && normalizeOrderStatus(updated) === "advance_paid"),
    order: updated || order,
    reason: updated ? "synced" : "not_paid",
  };
}

async function completePayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!isPaymentEnabled()) {
    throw new Error("Payment gateway is not configured.");
  }

  const order = await getOrderByRazorpayOrderId(razorpay_order_id);
  if (!order) throw new Error("Order not found.");

  const st = normalizeOrderStatus(order);
  if (st === "advance_paid" || st === "completed") {
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

  const paid = await markAdvancePaid(order.id, razorpay_payment_id);
  return { order: paid, alreadyPaid: false };
}

async function createBalancePaymentOrder(publicId) {
  const order = await getOrderByPublicId(publicId);
  if (!order) throw new Error("Order not found.");
  if (!canPayBalance(order)) {
    throw new Error("Balance payment is not available yet. Project must be delivered first.");
  }

  const balanceDue = getBalanceDue(order);
  if (balanceDue < 1) {
    throw new Error("No balance due on this order.");
  }

  if (!isPaymentEnabled()) {
    return {
      order,
      paymentConfigured: false,
      message: "Online payment is not configured. Contact us on WhatsApp to pay the remaining balance.",
    };
  }

  const amountPaise = balanceDue * 100;
  let razorpayOrderId = order.razorpay_balance_order_id;

  if (!razorpayOrderId) {
    const razorpay = getRazorpayClient();
    const rzOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `${publicId}-bal`.slice(0, 40),
      notes: {
        public_id: publicId,
        phase: "balance",
        service: order.service,
        plan: order.plan,
      },
    });
    razorpayOrderId = rzOrder.id;
    await queryOne(
      `UPDATE orders SET razorpay_balance_order_id = $1 WHERE id = $2 RETURNING *`,
      [razorpayOrderId, order.id],
    );
  }

  return {
    order,
    paymentConfigured: true,
    razorpayOrderId,
    amountPaise,
    amountInr: balanceDue,
    keyId: getRazorpayKeyId(),
  };
}

async function completeBalancePayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!isPaymentEnabled()) {
    throw new Error("Payment gateway is not configured.");
  }

  const order = await getOrderByRazorpayBalanceOrderId(razorpay_order_id);
  if (!order) throw new Error("Order not found.");

  if (normalizeOrderStatus(order) === "completed") {
    return { order, alreadyPaid: true };
  }

  if (!canPayBalance(order)) {
    throw new Error("Balance payment is not available for this order.");
  }

  if (razorpay_signature) {
    const ok = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );
    if (!ok) throw new Error("Payment verification failed.");
  }

  const paid = await markBalancePaid(order.id, razorpay_payment_id);
  return { order: paid, alreadyPaid: false };
}

async function syncAdvancePaymentForOrder(razorpayOrderId) {
  const razorpay = getRazorpayClient();
  if (!razorpay) return null;

  const order = await getOrderByRazorpayOrderId(razorpayOrderId);
  if (!order) return null;

  const st = normalizeOrderStatus(order);
  if (st !== "pending") return order;

  const expectedPaise = order.amount_inr * 100;
  const list = await razorpay.orders.fetchPayments(razorpayOrderId);
  const items = list?.items || [];

  const captured = items.find(
    (p) =>
      (p.status === "captured" || p.status === "authorized") &&
      Number(p.amount) === expectedPaise,
  );
  if (!captured) return null;

  return markAdvancePaid(order.id, captured.id);
}

async function syncBalancePaymentForOrder(razorpayOrderId) {
  const razorpay = getRazorpayClient();
  if (!razorpay) return null;

  const order = await getOrderByRazorpayBalanceOrderId(razorpayOrderId);
  if (!order) return null;

  if (normalizeOrderStatus(order) === "completed") return order;

  const expectedPaise = getBalanceDue(order) * 100;
  if (expectedPaise < 1) return null;

  const list = await razorpay.orders.fetchPayments(razorpayOrderId);
  const items = list?.items || [];

  const captured = items.find(
    (p) =>
      (p.status === "captured" || p.status === "authorized") &&
      Number(p.amount) === expectedPaise,
  );
  if (!captured) return null;

  return markBalancePaid(order.id, captured.id);
}

async function syncCapturedPaymentForOrder(razorpayOrderId) {
  const advance = await syncAdvancePaymentForOrder(razorpayOrderId);
  if (advance) return advance;
  return syncBalancePaymentForOrder(razorpayOrderId);
}

async function checkOrderPaymentStatus(publicId) {
  const order = await getOrderByPublicId(publicId);
  if (!order) {
    return { status: "not_found" };
  }

  const st = normalizeOrderStatus(order);
  if (st === "advance_paid" || st === "completed") {
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
    const synced = await syncAdvancePaymentForOrder(order.razorpay_order_id);
    if (synced && normalizeOrderStatus(synced) === "advance_paid") {
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

async function checkBalancePaymentStatus(publicId) {
  const order = await getOrderByPublicId(publicId);
  if (!order) {
    return { status: "not_found" };
  }

  if (normalizeOrderStatus(order) === "completed") {
    return {
      status: "paid",
      publicId: order.public_id,
      redirectUrl: `/order/balance-success?id=${encodeURIComponent(order.public_id)}`,
    };
  }

  if (!order.razorpay_balance_order_id || !isPaymentEnabled()) {
    return { status: "pending", publicId: order.public_id };
  }

  try {
    const synced = await syncBalancePaymentForOrder(order.razorpay_balance_order_id);
    if (synced && normalizeOrderStatus(synced) === "completed") {
      return {
        status: "paid",
        publicId: synced.public_id,
        redirectUrl: `/order/balance-success?id=${encodeURIComponent(synced.public_id)}`,
      };
    }
  } catch (err) {
    console.error("[payments] sync balance status", err.message);
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
  createBalancePaymentOrder,
  completePayment,
  completeBalancePayment,
  getOrderByPublicId,
  buildReceiptData,
  computeAdvanceInr,
  getAdvancePercent,
  markOrderDelivered,
  markAdvancePaidManual,
  deleteOrderById,
  resumeAdvancePaymentOrder,
  syncOrderAdvanceById,
  syncAdvancePaymentForOrder,
  checkOrderPaymentStatus,
  checkBalancePaymentStatus,
  verifyWebhookSignature,
  handleWebhookEvent,
  normalizeOrderStatus,
  getAdvancePaidInr,
  getBalanceDue,
  canPayBalance,
};
