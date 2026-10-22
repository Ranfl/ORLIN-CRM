const express = require("express");

const { authenticate } = require("../middleware/auth.middleware");

const {
  ask,
  createSession,
  getSessions,
  getSession,
  getMessages,
  updateSession,
  deleteSession,
} = require("../controllers/aiAdvisor.controller");

const router = express.Router();

router.use(authenticate);

// CHAT
router.post("/ask", ask);

// SESSION
router.post("/sessions", createSession);

router.get("/sessions", getSessions);

router.get("/sessions/:id/messages", getMessages);

router.get("/sessions/:id", getSession);

router.patch("/sessions/:id", updateSession);

router.delete("/sessions/:id", deleteSession);

module.exports = router;
