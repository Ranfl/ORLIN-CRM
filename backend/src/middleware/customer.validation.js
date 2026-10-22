const { body, param, validationResult } = require("express-validator");

const validateCustomer = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Nama pelanggan wajib diisi")
    .isLength({
      max: 150,
    })
    .withMessage("Nama pelanggan maksimal 150 karakter"),

  body("email")
    .optional({
      checkFalsy: true,
    })
    .isEmail()
    .withMessage("Format email tidak valid")
    .normalizeEmail(),

  body("whatsapp")
    .optional({
      checkFalsy: true,
    })
    .trim()
    .isLength({
      max: 30,
    })
    .withMessage("Nomor WhatsApp maksimal 30 karakter"),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: "Validasi gagal",
        errors: errors.array(),
      });
    }

    next();
  },
];

const validateCustomerId = [
  param("id")
    .isInt({
      min: 1,
    })
    .withMessage("Customer ID tidak valid"),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: "Validasi gagal",
        errors: errors.array(),
      });
    }

    next();
  },
];

module.exports = {
  validateCustomer,
  validateCustomerId,
};
