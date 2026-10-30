// src/routes/whatsapp.routes.js

const express = require("express");

const {
  verifyWebhook,
  receiveWebhook,
} = require("../controllers/whatsapp.controller");

const router = express.Router();

// ==========================================
// META WEBHOOK VERIFICATION
// ==========================================

router.get("/webhook", verifyWebhook);

// ==========================================
// META WEBHOOK EVENTS
// ==========================================

router.post("/webhook", receiveWebhook);

module.exports = router;
