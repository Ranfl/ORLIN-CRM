const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Transaction = sequelize.define(
  "Transaction",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    transactionCode: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: "transaction_code",
    },

    customerId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "customer_id",
    },

    transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "transaction_date",
    },

    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "total_amount",
    },

    source: {
      type: DataTypes.ENUM("historical_import", "manual"),
      allowNull: false,
      defaultValue: "manual",
    },

    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "created_by",
    },
  },
  {
    tableName: "transactions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = Transaction;
