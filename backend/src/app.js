const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");

const customerRoutes = require("./routes/customer.routes");
const serviceRoutes = require("./routes/service.routes");
const transactionRoutes = require("./routes/transaction.routes");

const analysisRoutes = require("./routes/analysis.routes");

const promotionRoutes = require("./routes/promotion.routes");

const campaignRoutes = require("./routes/campaign.routes");

const notificationRoutes = require("./routes/notification.routes");

const crmInsightRoutes = require("./routes/crmInsight.routes");

const dashboardRoutes = require("./routes/dashboard.routes");

const reportRoutes = require("./routes/report.routes");

const aiAdvisorRoutes = require("./routes/aiAdvisor.routes");

const emailTestRoutes = require("./routes/emailTest.routes");
const whatsappRoutes = require("./routes/whatsapp.routes");

const {
  swaggerUi,
  swaggerDocument,
  swaggerUiOptions,
} = require("./config/swagger");

const app = express();

// Security Middleware
app.use(helmet());
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// Request Parser
app.use(
  express.json({
    limit: "2mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
  }),
);

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// API Routes
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/promotion-strategies", promotionRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/crm-insights", crmInsightRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/ai-advisor", aiAdvisorRoutes);
app.use("/api/email-test", emailTestRoutes);
app.use("/api/whatsapp", whatsappRoutes);



// Root Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    application: "ORLIN CRM API",
    message: "Backend service is running",
  });
});

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, swaggerUiOptions),
);

app.get("/api-docs.json", (req, res) => {
  return res.status(200).json(swaggerDocument);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

module.exports = app;
