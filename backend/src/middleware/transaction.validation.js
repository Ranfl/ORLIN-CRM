const { body, param, validationResult } = require("express-validator");

const handleValidationResult = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validasi gagal",
      errors: errors.array(),
    });
  }

  next();
};

const validateTransaction = [
  body("customerId")
    .isInt({
      min: 1,
    })
    .withMessage("Customer wajib dipilih"),

  body("transactionDate")
    .notEmpty()
    .withMessage("Tanggal transaksi wajib diisi")
    .isISO8601()
    .withMessage("Format tanggal transaksi tidak valid"),

  body("items")
    .isArray({
      min: 1,
    })
    .withMessage("Minimal terdapat satu layanan"),

  body("items.*.serviceId")
    .isInt({
      min: 1,
    })
    .withMessage("Service ID tidak valid"),

  body("items.*.quantity")
    .optional()
    .isInt({
      min: 1,
    })
    .withMessage("Quantity minimal 1"),

  handleValidationResult,
];

const validateTransactionId = [
  param("id")
    .isInt({
      min: 1,
    })
    .withMessage("Transaction ID tidak valid"),

  handleValidationResult,
];

module.exports = {
  validateTransaction,
  validateTransactionId,
};
