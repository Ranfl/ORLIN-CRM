const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CampaignDeliveryLog = sequelize.define(
  "CampaignDeliveryLog",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    campaignId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "campaign_id",
    },

    customerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "customer_id",
    },

    channel: {
      type: DataTypes.ENUM("whatsapp", "email"),
      allowNull: false,
    },

    recipient: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("pending", "simulated", "sent", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    attemptNumber: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      field: "attempt_number",
    },

    providerMessageId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "provider_message_id",
    },

    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message",
    },

    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "sent_at",
    },
  },
  {
    tableName: "campaign_delivery_logs",

    timestamps: true,

    createdAt: "created_at",

    updatedAt: false,
  },
);

module.exports = CampaignDeliveryLog;
