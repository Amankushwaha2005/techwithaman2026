/**
 * =============================================================================
 * BACKEND — auth routes
 * File: src/routes/auth.routes.js
 * Login, signup, Google / GitHub / Microsoft OAuth
 * =============================================================================
 */

const express = require("express");

const authController = require("../controllers/auth.controller");

const router = express.Router();

router.post("/auth/login", authController.login);
router.post("/auth/signup", authController.signup);

router.get("/auth/google", authController.googleAuth);
router.get("/auth/google/callback", authController.googleCallback);

router.get("/auth/github", authController.githubAuth);
router.get("/auth/github/callback", authController.githubCallback);

router.get("/auth/microsoft", authController.microsoftAuth);
router.get("/auth/microsoft/callback", authController.microsoftCallback);

router.get("/auth/logout", authController.logout);
router.post("/auth/logout", authController.logout);

module.exports = router;
