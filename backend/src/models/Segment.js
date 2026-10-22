const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Segment = sequelize.define(
  "Segment",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: "segment_code",
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "segment_name",
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    defaultObjective: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "default_objective",
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    tableName: "segments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = Segment;
