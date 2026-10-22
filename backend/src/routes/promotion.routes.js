const express = require("express");

const { authenticate } = require("../middleware/auth.middleware");

const {
  getPromotionStrategies,
  getPromotionStrategyById,
} = require("../controllers/promotion.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", getPromotionStrategies);

router.get("/:id", getPromotionStrategyById);

module.exports = router;
