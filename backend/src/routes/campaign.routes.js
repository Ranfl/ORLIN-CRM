const express = require("express");

const { authenticate, authorize } = require("../middleware/auth.middleware");

const {
  createCampaign,
  getCampaigns,
  getCampaignById,
  generateCampaignTargets,
  simulateDelivery,
  getDeliverySummary,
  getDeliveryLogs,
  testDelivery,
  schedule,
  start,
  complete,
  cancel,
} = require("../controllers/campaign.controller");

const router = express.Router();

// Semua route campaign wajib login
router.use(authenticate);

// OWNER + STAFF
router.get("/", getCampaigns);

router.get("/:id", getCampaignById);

router.get("/:id/delivery-summary", getDeliverySummary);

router.get("/:id/delivery-logs", getDeliveryLogs);

// OWNER ONLY
// Create campaign
router.post("/", authorize("owner"), createCampaign);

// Generate target
router.post(
  "/:id/generate-targets",
  authorize("owner"),
  generateCampaignTargets,
);

// Simulation delivery
router.post("/:id/simulate", authorize("owner"), simulateDelivery);

// Test delivery
router.post("/:id/test-delivery", authorize("owner"), testDelivery);

// CAMPAIGN LIFECYCLE
// draft ke scheduled
router.patch("/:id/schedule", authorize("owner"), schedule);

// scheduled ke active
router.patch("/:id/start", authorize("owner"), start);

// active ke completed
router.patch("/:id/complete", authorize("owner"), complete);

// draft/scheduled/active ke cancelled
router.patch("/:id/cancel", authorize("owner"), cancel);

module.exports = router;
