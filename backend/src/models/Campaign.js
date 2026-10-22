const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Campaign = sequelize.define(
  "Campaign",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    campaignCode: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: "campaign_code",
    },

    campaignName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "campaign_name",
    },

    analysisRunId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "analysis_run_id",
    },

    segmentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "segment_id",
    },

    promotionStrategyId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "promotion_strategy_id",
    },

    promotionType: {
      type: DataTypes.ENUM(
        "discount",
        "cashback",
        "voucher",
        "bundling",
        "other",
      ),
      allowNull: false,
      field: "promotion_type",
    },

    promotionValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      field: "promotion_value",
    },

    promotionUnit: {
      type: DataTypes.ENUM("percent", "amount"),
      allowNull: true,
      field: "promotion_unit",
    },

    offerDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "offer_description",
    },

    startDatetime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "start_datetime",
    },

    endDatetime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "end_datetime",
    },

    whatsappEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "whatsapp_enabled",
    },

    emailEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "email_enabled",
    },

    whatsappMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "whatsapp_message",
    },

    emailSubject: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "email_subject",
    },

    emailBody: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "email_body",
    },

    deliveryMode: {
      type: DataTypes.ENUM("simulation", "test", "live"),
      allowNull: false,
      defaultValue: "simulation",
      field: "delivery_mode",
    },

    status: {
      type: DataTypes.ENUM(
        "draft",
        "scheduled",
        "active",
        "completed",
        "cancelled",
      ),
      allowNull: false,
      defaultValue: "draft",
    },

    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "created_by",
    },
  },
  {
    tableName: "campaigns",

    timestamps: true,

    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = Campaign;
