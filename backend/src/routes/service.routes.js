const express = require("express");

const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deactivateService,
  reactivateService,
} = require("../controllers/service.controller");

const { authenticate, authorize } = require("../middleware/auth.middleware");

const {
  validateService,
  validateServiceId,
} = require("../middleware/service.validation");

const router = express.Router();

router.use(authenticate);

// LIST
// owner + staff
router.get("/", getServices);

// DETAIL
router.get("/:id", validateServiceId, getServiceById);

// CREATE - OWNER
router.post("/", authorize("owner"), validateService, createService);

// UPDATE - OWNER
router.put(
  "/:id",
  authorize("owner"),
  validateServiceId,
  validateService,
  updateService,
);

// DEACTIVATE - OWNER
router.delete("/:id", authorize("owner"), validateServiceId, deactivateService);

// REACTIVATE - OWNER
router.patch(
  "/:id/reactivate",
  authorize("owner"),
  validateServiceId,
  reactivateService,
);

module.exports = router;
