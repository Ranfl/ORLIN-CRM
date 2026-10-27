const express = require("express");

const { authenticate, authorize } = require("../middleware/auth.middleware");

const {
  verifySMTP,
  sendEmailTest,
} = require("../controllers/emailTest.controller");

const router = express.Router();

router.use(authenticate);

router.get("/verify", authorize("owner"), verifySMTP);

router.post("/send", authorize("owner"), sendEmailTest);

module.exports = router;
