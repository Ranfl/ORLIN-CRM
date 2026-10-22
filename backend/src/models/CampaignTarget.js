const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CampaignTarget = sequelize.define(
  "CampaignTarget",
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

    segmentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "segment_id",
    },

    analysisRunId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "analysis_run_id",
    },
  },
  {
    tableName: "campaign_targets",

    timestamps: true,

    createdAt: "created_at",

    updatedAt: false,
  },
);

module.exports = CampaignTarget;
