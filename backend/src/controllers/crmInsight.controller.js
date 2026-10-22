const {
  buildCRMInsightSnapshot,
  generateCRMInsightNotifications,
} = require("../services/crmInsight.service");

// GET CRM INSIGHT
const getCRMInsights = async (req, res, next) => {
  try {
    const data = await buildCRMInsightSnapshot(req.params.analysisRunId);

    return res.status(200).json({
      success: true,

      data,
    });
  } catch (error) {
    next(error);
  }
};

// GENERATE NOTIFICATIONS
const generateNotifications = async (req, res, next) => {
  try {
    const data = await generateCRMInsightNotifications(
      req.params.analysisRunId,
    );

    return res.status(201).json({
      success: true,

      message: "CRM insight notification berhasil diproses.",

      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCRMInsights,
  generateNotifications,
};
