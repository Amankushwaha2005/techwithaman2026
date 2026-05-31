/**
 * =============================================================================
 * BACKEND — forms routes
 * File: src/routes/forms.routes.js
 * POST /contact, /work, chatbot message
 * =============================================================================
 */

const express = require("express");

const formsController = require("../controllers/forms.controller");

const router = express.Router();

router.post("/contact", formsController.contact);
router.post("/work", formsController.work);
router.post("/api/chatbot-message", formsController.chatbotMessage);

module.exports = router;

