const express = require("express");

const { authenticate, authorize } = require("../middleware/auth.middleware");

const {
  getCRMInsights,
  generateNotifications,
} = require("../controllers/crmInsight.controller");

const router = express.Router();

router.use(authenticate);

// owner + staff
router.get("/:analysisRunId", getCRMInsights);

// owner only
router.post(
  "/:analysisRunId/generate-notifications",
  authorize("owner"),
  generateNotifications,
);

module.exports = router;
