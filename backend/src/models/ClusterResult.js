const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ClusterResult = sequelize.define(
  "ClusterResult",
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

    rfmResultId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "rfm_result_id",
    },

    clusterNumber: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "cluster_number",
    },

    segmentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "segment_id",
    },

    silhouetteValue: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      field: "silhouette_value",
    },
  },
  {
    tableName: "cluster_results",

    timestamps: true,

    createdAt: "created_at",

    updatedAt: false,
  },
);

module.exports = ClusterResult;
