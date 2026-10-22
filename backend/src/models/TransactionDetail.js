const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TransactionDetail = sequelize.define(
  "TransactionDetail",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    transactionId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "transaction_id",
    },

    serviceId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "service_id",
    },

    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },

    unitPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: "unit_price",
    },

    subtotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
  },
  {
    tableName: "transaction_details",

    timestamps: true,

    createdAt: "created_at",

    // tabel kita tidak punya updated_at
    updatedAt: false,
  },
);

module.exports = TransactionDetail;
