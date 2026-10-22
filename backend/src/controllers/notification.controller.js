const { Notification } = require("../models");

// GET NOTIFICATIONS
const {
  generateWeeklyNewCustomerNotification,
} = require("../services/notification.service");

const getNotifications = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

    const offset = (page - 1) * limit;

    const where = {
      userId: req.user.id,
    };

    if (req.query.status === "read") {
      where.isRead = true;
    }

    if (req.query.status === "unread") {
      where.isRead = false;
    }

    if (req.query.type) {
      where.notificationType = req.query.type;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,

      order: [["createdAt", "DESC"]],

      limit,
      offset,
    });

    return res.status(200).json({
      success: true,

      data: {
        notifications: rows,

        pagination: {
          page,

          limit,

          totalData: count,

          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET UNREAD COUNT
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({
      where: {
        userId: req.user.id,

        isRead: false,
      },
    });

    return res.status(200).json({
      success: true,

      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    next(error);
  }
};

// MARK ONE AS READ
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,

        userId: req.user.id,
      },
    });

    if (!notification) {
      const error = new Error("Notification tidak ditemukan.");

      error.status = 404;

      throw error;
    }

    if (!notification.isRead) {
      notification.isRead = true;

      notification.readAt = new Date();

      await notification.save();
    }

    return res.status(200).json({
      success: true,

      message: "Notification ditandai sebagai dibaca.",

      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// MARK ALL AS READ
const markAllAsRead = async (req, res, next) => {
  try {
    const [affectedRows] = await Notification.update(
      {
        isRead: true,

        readAt: new Date(),
      },

      {
        where: {
          userId: req.user.id,

          isRead: false,
        },
      },
    );

    return res.status(200).json({
      success: true,

      message: "Semua notification telah dibaca.",

      data: {
        updated: affectedRows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GENERATE WEEKLY NEW CUSTOMER
const generateWeeklyNewCustomers =
  async (
    req,
    res,
    next
  ) => {

    try {

      const {
        weekStart,
      } =
        req.body;


      const data =
        await generateWeeklyNewCustomerNotification({
          weekStart,
        });


      return res
        .status(201)
        .json({

          success:
            true,

          message:
            "Weekly new customer notification berhasil diproses.",

          data,
        });

    } catch (error) {

      next(error);
    }
  };

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  generateWeeklyNewCustomers,
};