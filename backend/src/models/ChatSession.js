const { DataTypes } = require("sequelize");

const sequelize = require("../config/database");

const ChatSession = sequelize.define(
  "ChatSession",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,

      allowNull: false,

      primaryKey: true,

      autoIncrement: true,
    },

    userId: {
      type: DataTypes.BIGINT.UNSIGNED,

      allowNull: false,

      field: "user_id",
    },

    title: {
      type: DataTypes.STRING(200),

      allowNull: true,
    },

    createdAt: {
      type: DataTypes.DATE,

      allowNull: false,

      defaultValue: DataTypes.NOW,

      field: "created_at",
    },

    updatedAt: {
      type: DataTypes.DATE,

      allowNull: false,

      defaultValue: DataTypes.NOW,

      field: "updated_at",
    },
  },
  {
    tableName: "chat_sessions",

    timestamps: false,
  },
);

module.exports = ChatSession;
