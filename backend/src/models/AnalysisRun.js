const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AnalysisRun = sequelize.define(
  "AnalysisRun",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "analysis_name",
    },

    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date",
    },

    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "end_date",
    },

    referenceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "reference_date",
    },

    totalCustomers: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: "total_customers",
    },

    modelVersion: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "kmeans-v1",
      field: "model_version",
    },

    preprocessing: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "StandardScaler",
    },

    kValue: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 4,
      field: "k_value",
    },

    silhouetteScore: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      field: "silhouette_score",
    },

    daviesBouldinIndex: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      field: "davies_bouldin_index",
    },

    calinskiHarabaszScore: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: true,
      field: "calinski_harabasz_index",
    },

    status: {
      type: DataTypes.ENUM("pending", "processing", "completed", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },

    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message",
    },

    createdBy: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: "created_by",
    },
  },
  {
    tableName: "analysis_runs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

module.exports = AnalysisRun;
