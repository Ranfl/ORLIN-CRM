const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const RfmResult = sequelize.define(
  "RfmResult",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    analysisRunId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "analysis_run_id",
    },

    customerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "customer_id",
    },

    lastTransactionDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "last_transaction_date",
    },

    recency: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },

    frequency: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },

    monetary: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
  },
  {
    tableName: "rfm_results",

    timestamps: true,

    createdAt: "created_at",

    // tabel rfm_results tidak punya updated_at
    updatedAt: false,
  },
);

module.exports = RfmResult;
