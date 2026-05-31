/**
 * =============================================================================
 * BACKEND — payments routes
 * File: src/routes/payments.routes.js
 * Order create, verify, status, webhook
 * =============================================================================
 */

const express = require("express");

const paymentsController = require("../controllers/payments.controller");

const router = express.Router();

router.get("/order", paymentsController.showOrder);
router.get("/order/success", paymentsController.showOrderSuccess);
router.get("/order/pay-balance", paymentsController.showPayBalance);
router.get("/order/balance-success", paymentsController.showBalanceSuccess);
router.get("/order/receipt", paymentsController.showOrderReceipt);
router.post("/api/payments/create-order", paymentsController.createOrder);
router.post("/api/payments/create-balance-order", paymentsController.createBalanceOrder);
router.post("/api/payments/verify", paymentsController.verifyPayment);
router.post("/api/payments/verify-balance", paymentsController.verifyBalancePayment);
router.get("/api/payments/status", paymentsController.paymentStatus);
router.post("/api/payments/status", paymentsController.paymentStatus);
router.get("/api/payments/balance-status", paymentsController.balancePaymentStatus);
router.post("/api/payments/balance-status", paymentsController.balancePaymentStatus);

module.exports = router;
