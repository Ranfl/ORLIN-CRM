const express = require("express");

const { authenticate } = require("../middleware/auth.middleware");

const { getDashboardSummary } = require("../controllers/dashboard.controller");

const router = express.Router();

router.use(authenticate);

// owner + staff
router.get("/summary", getDashboardSummary);

module.exports = router;
