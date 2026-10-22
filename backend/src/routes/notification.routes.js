const express = require("express");

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  generateWeeklyNewCustomers,
} = require("../controllers/notification.controller");

const { authenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

// READ
router.get("/", getNotifications);

router.get("/unread-count", getUnreadCount);

// UPDATE
router.patch("/read-all", markAllAsRead);

router.patch("/:id/read", markAsRead);

router.post(
  "/generate-weekly-customers",
  authorize("owner"),
  generateWeeklyNewCustomers,
);

module.exports = router;
