const { buildDashboardSummary } = require("../services/dashboard.service");

// DATE VALIDATION
const isValidDateOnly = (value) => {
  if (!value) {
    return true;
  }

  const pattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!pattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

// GET DASHBOARD SUMMARY
const getDashboardSummary = async (req, res, next) => {
  try {
    const referenceDate = req.query.referenceDate?.trim() || null;

    if (referenceDate && !isValidDateOnly(referenceDate)) {
      return res.status(400).json({
        success: false,

        message: "Format referenceDate harus YYYY-MM-DD.",
      });
    }

    const data = await buildDashboardSummary({
      userId: req.user.id,

      requestedReferenceDate: referenceDate,
    });

    return res.status(200).json({
      success: true,

      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
};
