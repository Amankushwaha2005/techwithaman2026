const express = require("express");

const authController = require("../controllers/auth.controller");

const router = express.Router();

router.post("/auth/login", authController.login);
router.post("/auth/signup", authController.signup);
router.get("/auth/google", authController.googleAuth);
router.get("/auth/google/callback", authController.googleCallback);
router.get("/auth/logout", authController.logout);
router.post("/auth/logout", authController.logout);

module.exports = router;

