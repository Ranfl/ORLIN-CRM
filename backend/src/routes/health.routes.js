const express = require("express");
const sequelize = require("../config/database");

const router = express.Router();

router.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "ORLIN CRM Backend is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

router.get("/db-health", async (req, res) => {
  try {
    await sequelize.authenticate();

    return res.status(200).json({
      success: true,
      message: "Database connection successful",
      database: process.env.DB_NAME,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

module.exports = router;
