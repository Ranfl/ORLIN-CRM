const express = require("express");

const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/transaction.controller");

const { authenticate, authorize } = require("../middleware/auth.middleware");

const {
  validateTransaction,
  validateTransactionId,
} = require("../middleware/transaction.validation");

const router = express.Router();

router.use(authenticate);

// LIST
router.get("/", getTransactions);

// DETAIL
router.get("/:id", validateTransactionId, getTransactionById);

// CREATE
router.post("/", validateTransaction, createTransaction);

// UPDATE
router.put(
  "/:id",
  validateTransactionId,
  validateTransaction,
  updateTransaction,
);

// DELETE
// owner only
router.delete(
  "/:id",
  authorize("owner"),
  validateTransactionId,
  deleteTransaction,
);

module.exports = router;
