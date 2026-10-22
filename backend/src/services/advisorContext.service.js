const { buildDashboardSummary } = require("./dashboard.service");

const { buildCRMInsightSnapshot } = require("./crmInsight.service");

// BUILD ADVISOR CONTEXT
const buildAdvisorContext = async ({ userId }) => {
  const dashboard = await buildDashboardSummary({
    userId,
  });

  const analysisRunId = dashboard?.analysis?.id || null;

  let crmInsight = null;

  if (analysisRunId) {
    crmInsight = await buildCRMInsightSnapshot(analysisRunId);
  }

  // Context yang diberikan ke AI
  return {
    referenceDate: dashboard.referenceDate,

    business: {
      name: "ORLIN Salon Banjarnegara",

      domain: "Salon dan layanan kecantikan",
    },

    kpi: dashboard.kpi,

    latestAnalysis: dashboard.analysis
      ? {
          id: dashboard.analysis.id,

          name: dashboard.analysis.analysisName,

          referenceDate: dashboard.analysis.referenceDate,

          totalCustomers: dashboard.analysis.totalCustomers,

          modelVersion: dashboard.analysis.modelVersion,

          preprocessing: dashboard.analysis.preprocessing,

          kValue: dashboard.analysis.kValue,

          silhouetteScore: dashboard.analysis.silhouetteScore,

          daviesBouldinIndex: dashboard.analysis.daviesBouldinIndex,

          calinskiHarabaszScore: dashboard.analysis.calinskiHarabaszScore,
        }
      : null,

    segmentDistribution: dashboard.segmentDistribution,

    topService: dashboard.topService,

    transactionTrend: dashboard.transactionTrend,

    recentCampaigns: dashboard.recentCampaigns,

    crmInsights: crmInsight ? crmInsight.insights : [],

    segmentChanges: crmInsight ? crmInsight.segmentChanges : [],
  };
};

module.exports = {
  buildAdvisorContext,
};
