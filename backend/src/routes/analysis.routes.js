const express = require("express");

const {
  createAnalysis,
  getAnalyses,
  getAnalysisById,
  getAnalysisSummary,
  getAnalysisCustomers,
  getAnalysisCustomerById,
} = require("../controllers/analysis.controller");

const { authenticate, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

// Semua analysis route wajib login
router.use(authenticate);

// LIST ANALYSIS
router.get("/", getAnalyses);

// ANALYSIS SUMMARY
router.get("/:id/summary", getAnalysisSummary);

// CUSTOMER LIST PER ANALYSIS
router.get("/:id/customers", getAnalysisCustomers);

// CUSTOMER DETAIL PER ANALYSIS
router.get("/:id/customers/:customerId", getAnalysisCustomerById);

// ANALYSIS DETAIL
router.get("/:id", getAnalysisById);

// RUN ANALYSIS
// OWNER ONLY
router.post("/run", authorize("owner"), createAnalysis);

module.exports = router;
