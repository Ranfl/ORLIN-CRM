const { DataTypes } = require("sequelize");

const sequelize = require("../config/database");

const ChatMessage = sequelize.define(
  "ChatMessage",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,

      allowNull: false,

      primaryKey: true,

      autoIncrement: true,
    },

    chatSessionId: {
      type: DataTypes.BIGINT.UNSIGNED,

      allowNull: false,

      field: "chat_session_id",
    },

    role: {
      type: DataTypes.ENUM("user", "assistant", "system"),

      allowNull: false,
    },

    message: {
      type: DataTypes.TEXT,

      allowNull: false,
    },

    createdAt: {
      type: DataTypes.DATE,

      allowNull: false,

      defaultValue: DataTypes.NOW,

      field: "created_at",
    },
  },
  {
    tableName: "chat_messages",

    timestamps: false,
  },
);

module.exports = ChatMessage;
