const express = require("express");

const paymentsController = require("../controllers/payments.controller");

const router = express.Router();

router.get("/order", paymentsController.showOrder);
router.get("/order/success", paymentsController.showOrderSuccess);
router.post("/api/payments/create-order", paymentsController.createOrder);
router.post("/api/payments/verify", paymentsController.verifyPayment);
router.get("/api/payments/status", paymentsController.paymentStatus);
router.post("/api/payments/status", paymentsController.paymentStatus);

module.exports = router;
