const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PromotionStrategy = sequelize.define(
  "PromotionStrategy",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    segmentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "segment_id",
    },

    strategyName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "strategy_name",
    },

    objective: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    tableName: "promotion_strategies",

    timestamps: true,

    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = PromotionStrategy;
