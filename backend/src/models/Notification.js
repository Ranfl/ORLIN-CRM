const { DataTypes } = require("sequelize");

const sequelize = require("../config/database");

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,

      primaryKey: true,

      autoIncrement: true,
    },

    userId: {
      type: DataTypes.BIGINT.UNSIGNED,

      allowNull: true,

      field: "user_id",
    },

    notificationType: {
      type: DataTypes.STRING(50),

      allowNull: false,

      field: "notification_type",
    },

    title: {
      type: DataTypes.STRING(200),

      allowNull: false,
    },

    message: {
      type: DataTypes.TEXT,

      allowNull: false,
    },

    referenceType: {
      type: DataTypes.STRING(50),

      allowNull: true,

      field: "reference_type",
    },

    referenceId: {
      type: DataTypes.BIGINT.UNSIGNED,

      allowNull: true,

      field: "reference_id",
    },

    isRead: {
      type: DataTypes.BOOLEAN,

      allowNull: false,

      defaultValue: false,

      field: "is_read",
    },

    createdAt: {
  type: DataTypes.DATE,
  allowNull: false,
  defaultValue: DataTypes.NOW,
  field: "created_at",
},

    readAt: {
      type: DataTypes.DATE,

      allowNull: true,

      field: "read_at",
    },
  },
  {
    tableName: "notifications",

    timestamps: false,
  },
);

module.exports = Notification;
