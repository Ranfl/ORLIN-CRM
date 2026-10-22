const express = require("express");

const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  reactivateCustomer,
} = require("../controllers/customer.controller");

const { authenticate, authorize } = require("../middleware/auth.middleware");

const {
  validateCustomer,
  validateCustomerId,
} = require("../middleware/customer.validation");

const router = express.Router();

// Semua route customer wajib login
router.use(authenticate);

// LIST
router.get("/", getCustomers);

// DETAIL
router.get("/:id", validateCustomerId, getCustomerById);

// CREATE
router.post("/", validateCustomer, createCustomer);

// UPDATE
router.put("/:id", validateCustomerId, validateCustomer, updateCustomer);

// DEACTIVATE - OWNER ONLY
router.delete(
  "/:id",
  authorize("owner"),
  validateCustomerId,
  deactivateCustomer,
);

// REACTIVATE - OWNER ONLY
router.patch(
  "/:id/reactivate",
  authorize("owner"),
  validateCustomerId,
  reactivateCustomer,
);

module.exports = router;
