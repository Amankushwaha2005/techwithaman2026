const express = require("express");
const aiController = require("../controllers/ai.controller");

const router = express.Router();

router.get("/api/ai/status", aiController.status);
router.post("/api/ai/chat", aiController.chat);

module.exports = router;
