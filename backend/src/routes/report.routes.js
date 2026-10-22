const express = require("express");

const { authenticate } = require("../middleware/auth.middleware");

const {
  getSummary,
  getOverview,
  getTransactions,
  getSegmentation,
  getCampaigns,
} = require("../controllers/report.controller");

const router = express.Router();

router.use(authenticate);

// owner + staff
router.get("/summary", getSummary);

router.get("/overview", getOverview);

router.get("/transactions", getTransactions);

router.get("/segmentation", getSegmentation);

router.get("/campaigns", getCampaigns);

module.exports = router;
