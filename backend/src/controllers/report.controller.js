const { QueryTypes } = require("sequelize");

const sequelize = require("../config/database");

const {
  resolvePeriod,
  getOverviewReport,
  getTransactionReport,
  getSegmentationReport,
  getCampaignReport,
  buildReportSummary,
} = require("../services/report.service");

// VALIDATION
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

// VALIDATE QUERY
const validateQuery = (req, res) => {
  const startDate = req.query.startDate?.trim() || null;

  const endDate = req.query.endDate?.trim() || null;

  // Date format validation
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) {
    res.status(400).json({
      success: false,

      message: "Format startDate dan endDate harus YYYY-MM-DD.",
    });

    return null;
  }

  // Date range validation
  if (startDate && endDate && startDate > endDate) {
    res.status(400).json({
      success: false,

      message: "startDate tidak boleh lebih besar dari endDate.",
    });

    return null;
  }

  // Analysis run validation
  let analysisRunId = null;

  if (req.query.analysisRunId) {
    analysisRunId = Number(req.query.analysisRunId);

    if (!Number.isInteger(analysisRunId) || analysisRunId <= 0) {
      res.status(400).json({
        success: false,

        message: "analysisRunId harus berupa integer positif.",
      });

      return null;
    }
  }

  return {
    startDate,
    endDate,
    analysisRunId,
  };
};

// SUMMARY
const getSummary = async (req, res, next) => {
  try {
    const query = validateQuery(req, res);

    if (!query) {
      return;
    }

    const data = await buildReportSummary(query);

    return res.status(200).json({
      success: true,

      data,
    });
  } catch (error) {
    next(error);
  }
};

// OVERVIEW
const getOverview = async (req, res, next) => {
  try {
    const query = validateQuery(req, res);

    if (!query) {
      return;
    }

    const period = await resolvePeriod(query.startDate, query.endDate);

    const data = await getOverviewReport(period.startDate, period.endDate);

    return res.status(200).json({
      success: true,

      data: {
        period,

        overview: data,
      },
    });
  } catch (error) {
    next(error);
  }
};

// TRANSACTIONS
const getTransactions = async (req, res, next) => {
  try {
    const query = validateQuery(req, res);

    if (!query) {
      return;
    }

    const period = await resolvePeriod(query.startDate, query.endDate);

    const data = await getTransactionReport(period.startDate, period.endDate);

    return res.status(200).json({
      success: true,

      data: {
        period,

        ...data,
      },
    });
  } catch (error) {
    next(error);
  }
};

// SEGMENTATION
const getSegmentation = async (req, res, next) => {
  try {
    const query = validateQuery(req, res);

    if (!query) {
      return;
    }

    const data = await getSegmentationReport(query.analysisRunId);

    return res.status(200).json({
      success: true,

      data,
    });
  } catch (error) {
    next(error);
  }
};

// CAMPAIGN PERIOD
const resolveCampaignPeriod = async (startDate = null, endDate = null) => {

  // Kalau user isi start + end langsung pake filter itu
  if (startDate && endDate) {
    return {
      startDate,
      endDate,
    };
  }

  const rows = await sequelize.query(
    `
        SELECT

          DATE_FORMAT(
            MIN(start_datetime),
            '%Y-%m-%d'
          ) AS minDate,

          DATE_FORMAT(
            MAX(end_datetime),
            '%Y-%m-%d'
          ) AS maxDate

        FROM campaigns
        `,
    {
      type: QueryTypes.SELECT,
    },
  );

  const minDate = rows[0]?.minDate || null;

  const maxDate = rows[0]?.maxDate || null;

  // Belum ada campaign
  if (!minDate || !maxDate) {
    return null;
  }

  return {
    startDate: startDate || minDate,

    endDate: endDate || maxDate,
  };
};

// CAMPAIGNS
const getCampaigns = async (req, res, next) => {
  try {
    const query = validateQuery(req, res);

    if (!query) {
      return;
    }

    // Gunakan periode CAMPAIGN
    const period = await resolveCampaignPeriod(query.startDate, query.endDate);

    // Kalau belum ada campaign
    if (!period) {
      return res.status(200).json({
        success: true,

        data: {
          period: null,

          campaigns: [],
        },
      });
    }

    // Get campaign report
    const data = await getCampaignReport(period.startDate, period.endDate);

    return res.status(200).json({
      success: true,

      data: {
        period,

        campaigns: data,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getOverview,
  getTransactions,
  getSegmentation,
  getCampaigns,
};
