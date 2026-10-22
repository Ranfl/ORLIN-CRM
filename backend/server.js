require("dotenv").config();

const app = require("./src/app");
const sequelize = require("./src/config/database");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log("=================================");
    console.log("Starting ORLIN CRM Backend...");
    console.log("=================================");

    await sequelize.authenticate();

    console.log("MySQL connection established.");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("Failed to start application.");
    console.error(error);

    process.exit(1);
  }
};

startServer();
