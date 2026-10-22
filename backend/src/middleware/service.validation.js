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

const validateService = [
  body("serviceName")
    .trim()
    .notEmpty()
    .withMessage("Nama layanan wajib diisi")
    .isLength({
      max: 150,
    })
    .withMessage("Nama layanan maksimal 150 karakter"),

  body("price")
    .notEmpty()
    .withMessage("Harga layanan wajib diisi")
    .isFloat({
      min: 0,
    })
    .withMessage("Harga layanan harus berupa angka dan tidak boleh negatif"),

  handleValidationResult,
];

const validateServiceId = [
  param("id")
    .isInt({
      min: 1,
    })
    .withMessage("Service ID tidak valid"),

  handleValidationResult,
];

module.exports = {
  validateService,
  validateServiceId,
};
