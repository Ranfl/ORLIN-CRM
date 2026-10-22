const { Notification, User } = require("../models");

// CREATE NOTIP
const sequelize = require("../config/database");

const { QueryTypes } = require("sequelize");

const createNotification = async ({
  userId = null,
  notificationType,
  title,
  message,
  referenceType = null,
  referenceId = null,
}) => {
  return Notification.create({
    userId,
    notificationType,
    title,
    message,
    referenceType,
    referenceId,
    isRead: false,
    readAt: null,
  });
};

// CREATE NOTIP FOR ALL ACTIVE USERS
const createNotificationForAllUsers = async ({
  notificationType,
  title,
  message,
  referenceType = null,
  referenceId = null,
}) => {
  const users = await User.findAll({
    where: {
      isActive: true,
    },

    attributes: ["id"],
  });

  if (users.length === 0) {
    return [];
  }

  const records = users.map((user) => ({
    userId: user.id,

    notificationType,

    title,

    message,

    referenceType,

    referenceId,

    isRead: false,

    readAt: null,
  }));

  return Notification.bulkCreate(records);
};

// CHECK DUPLICATE
const notificationExists = async ({
  userId = null,
  notificationType,
  referenceType,
  referenceId,
}) => {
  const existing = await Notification.findOne({
    where: {
      userId,
      notificationType,
      referenceType,
      referenceId,
    },
  });

  return Boolean(existing);
};

// WEEKLY NEW CUSTOMER NOTIFICATION
const generateWeeklyNewCustomerNotification =
  async ({
    weekStart,
  }) => {

    if (!weekStart) {

      const error =
        new Error(
          "weekStart wajib diisi dengan format YYYY-MM-DD."
        );

      error.status = 400;

      throw error;
    }

    const pattern =
      /^\d{4}-\d{2}-\d{2}$/;


    if (!pattern.test(weekStart)) {

      const error =
        new Error(
          "Format weekStart harus YYYY-MM-DD."
        );

      error.status = 400;

      throw error;
    }


    const startDate =
      new Date(
        `${weekStart}T00:00:00+07:00`
      );


    if (
      Number.isNaN(
        startDate.getTime()
      )
    ) {

      const error =
        new Error(
          "Tanggal weekStart tidak valid."
        );

      error.status = 400;

      throw error;
    }

    const endDate =
      new Date(
        startDate.getTime()
        +
        (
          7 *
          24 *
          60 *
          60 *
          1000
        )
        -
        1
      );


    const referenceId =
      Number(
        weekStart.replace(
          /-/g,
          ""
        )
      );

    const result =
      await sequelize.query(
        `
        SELECT
          COUNT(*) AS total
        FROM (
          SELECT
            customer_id,
            MIN(transaction_date)
              AS first_transaction_date
          FROM transactions
          GROUP BY customer_id
          HAVING
            MIN(transaction_date)
              BETWEEN :startDate
              AND :endDate
        ) AS first_visits
        `,
        {
          replacements: {
            startDate,
            endDate,
          },

          type:
            QueryTypes.SELECT,
        }
      );


    const totalNewCustomers =
      Number(
        result[0]?.total || 0
      );

    // Active users
    const users =
      await User.findAll({

        where: {
          isActive:
            true,
        },

        attributes: [
          "id",
        ],
      });


    let created = 0;
    let skipped = 0;


    for (
      const user
      of users
    ) {

      // Prevent duplicate per minggu/user
      const exists =
        await Notification.findOne({

          where: {

            userId:
              user.id,

            notificationType:
              "weekly_new_customer",

            referenceType:
              "weekly_customer_summary",

            referenceId,
          },
        });


      if (exists) {

        skipped++;

        continue;
      }


      await Notification.create({

        userId:
          user.id,

        notificationType:
          "weekly_new_customer",

        title:
          "Customer Baru Mingguan",

        message:
          totalNewCustomers > 0
            ?
            `${totalNewCustomers} customer baru melakukan transaksi pertama pada minggu ini.`
            :
            "Tidak ada customer baru yang melakukan transaksi pertama pada minggu ini.",

        referenceType:
          "weekly_customer_summary",

        referenceId,

        isRead:
          false,

        readAt:
          null,
      });


      created++;
    }


    return {

      period: {

        weekStart,

        weekEnd:
          endDate
            .toLocaleDateString(
              "en-CA",
              {
                timeZone:
                  "Asia/Jakarta",
              }
            ),
      },

      totalNewCustomers,

      notification: {
        created,
        skipped,
      },
    };
  };

module.exports = {
  createNotification,
  createNotificationForAllUsers,
  notificationExists,
  generateWeeklyNewCustomerNotification,
};