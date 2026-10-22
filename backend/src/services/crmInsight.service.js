const sequelize = require("../config/database");

const { QueryTypes } = require("sequelize");

const { Notification, User } = require("../models");

const AT_RISK_THRESHOLD = 30;

const SEGMENT_CHANGE_THRESHOLD = 5;

// GET ANALYSIS RUN
const getAnalysisRun = async (analysisRunId) => {
  const rows = await sequelize.query(
    `
      SELECT
        id,
        analysis_name,
        start_date,
        end_date,
        reference_date,
        total_customers,
        status,
        created_at
      FROM analysis_runs
      WHERE id = :analysisRunId
      LIMIT 1
      `,
    {
      replacements: {
        analysisRunId,
      },

      type: QueryTypes.SELECT,
    },
  );

  if (rows.length === 0) {
    const error = new Error("Analysis run tidak ditemukan.");

    error.status = 404;

    throw error;
  }

  const analysis = rows[0];

  if (analysis.status !== "completed") {
    const error = new Error(
      "CRM insight hanya dapat dibuat dari analysis yang completed.",
    );

    error.status = 400;

    throw error;
  }

  return analysis;
};

// SEGMENT DISTRIBUTION
const getSegmentDistribution = async (analysisRunId) => {
  const rows = await sequelize.query(
    `
      SELECT
        s.segment_code AS code,
        s.segment_name AS name,
        COUNT(*) AS total
      FROM cluster_results cr
      INNER JOIN segments s
        ON cr.segment_id = s.id
      WHERE cr.analysis_run_id = :analysisRunId
      GROUP BY
        s.id,
        s.segment_code,
        s.segment_name
      ORDER BY total DESC
      `,
    {
      replacements: {
        analysisRunId,
      },

      type: QueryTypes.SELECT,
    },
  );

  const grandTotal = rows.reduce((total, row) => total + Number(row.total), 0);

  return rows.map((row) => ({
    code: row.code,

    name: row.name,

    total: Number(row.total),

    percentage:
      grandTotal > 0
        ? Number(((Number(row.total) / grandTotal) * 100).toFixed(2))
        : 0,
  }));
};

// TOP SERVICE
const getTopService = async (startDate, endDate) => {
  const rows = await sequelize.query(
    `
      SELECT
        s.id,
        s.service_code AS serviceCode,
        s.service_name AS serviceName,

        SUM(td.quantity)
          AS totalQuantity,

        COUNT(
          DISTINCT t.id
        )
          AS totalTransactions,

        SUM(td.subtotal)
          AS revenue

      FROM transaction_details td

      INNER JOIN transactions t
        ON td.transaction_id = t.id

      INNER JOIN services s
        ON td.service_id = s.id

      WHERE
        t.transaction_date
        BETWEEN :startDate
        AND :endDate

      GROUP BY
        s.id,
        s.service_code,
        s.service_name

      ORDER BY
        totalQuantity DESC,
        revenue DESC

      LIMIT 1
      `,
    {
      replacements: {
        startDate: `${startDate} 00:00:00`,

        endDate: `${endDate} 23:59:59`,
      },

      type: QueryTypes.SELECT,
    },
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    id: rows[0].id,

    serviceCode: rows[0].serviceCode,

    serviceName: rows[0].serviceName,

    totalQuantity: Number(rows[0].totalQuantity),

    totalTransactions: Number(rows[0].totalTransactions),

    revenue: Number(rows[0].revenue),
  };
};

// PREVIOUS COMPLETED ANALYSIS
const getPreviousAnalysis = async (currentAnalysis) => {
  const rows = await sequelize.query(
    `
      SELECT
        id,
        analysis_name,
        start_date,
        end_date,
        reference_date,
        created_at
      FROM analysis_runs
      WHERE
        status = 'completed'
        AND id <> :currentId
        AND created_at < :createdAt
      ORDER BY
        created_at DESC
      LIMIT 1
      `,
    {
      replacements: {
        currentId: currentAnalysis.id,

        createdAt: currentAnalysis.created_at,
      },

      type: QueryTypes.SELECT,
    },
  );

  return rows.length > 0 ? rows[0] : null;
};

// SEGMENT CHANGE
const calculateSegmentChanges = (current, previous) => {
  const codes = ["VVIP", "LOYAL", "AT_RISK", "INACTIVE"];

  return codes.map((code) => {
    const currentSegment = current.find((item) => item.code === code);

    const previousSegment = previous.find((item) => item.code === code);

    const currentPercentage = currentSegment?.percentage || 0;

    const previousPercentage = previousSegment?.percentage || 0;

    return {
      code,

      currentPercentage,

      previousPercentage,

      change: Number((currentPercentage - previousPercentage).toFixed(2)),
    };
  });
};

// BUILD CRM INSIGHT SNAPSHOT
const buildCRMInsightSnapshot = async (analysisRunId) => {
  const analysis = await getAnalysisRun(analysisRunId);

  const segmentDistribution = await getSegmentDistribution(analysis.id);

  const topService = await getTopService(
    analysis.start_date,
    analysis.end_date,
  );

  const previousAnalysis = await getPreviousAnalysis(analysis);

  let segmentChanges = [];

  if (previousAnalysis) {
    const previousDistribution = await getSegmentDistribution(
      previousAnalysis.id,
    );

    segmentChanges = calculateSegmentChanges(
      segmentDistribution,
      previousDistribution,
    );
  }

  // Build Insights
  const insights = [];

  // Dominant segment
  if (segmentDistribution.length > 0) {
    const dominant = segmentDistribution[0];

    insights.push({
      type: "crm_dominant_segment",

      severity: "info",

      title: "Segmen Customer Dominan",

      message: `${dominant.name} merupakan segmen terbesar dengan ${dominant.total} customer (${dominant.percentage}%).`,

      data: {
        segment: dominant,
      },
    });
  }

  // At Risk warning
  const atRisk = segmentDistribution.find((item) => item.code === "AT_RISK");

  if (atRisk && atRisk.percentage >= AT_RISK_THRESHOLD) {
    insights.push({
      type: "crm_at_risk_attention",

      severity: "warning",

      title: "Customer At Risk Perlu Perhatian",

      message: `${atRisk.total} customer (${atRisk.percentage}%) berada pada segmen At Risk. Campaign reactivation dapat dipertimbangkan.`,

      data: {
        segment: atRisk,

        threshold: AT_RISK_THRESHOLD,
      },
    });
  }

  // Top service
  if (topService) {
    insights.push({
      type: "crm_top_service",

      severity: "info",

      title: "Layanan Terpopuler",

      message: `${topService.serviceName} menjadi layanan paling banyak digunakan pada periode analisis.`,

      data: {
        service: topService,
      },
    });
  }

  // Segment change
  if (segmentChanges.length > 0) {
    const biggestChange = [...segmentChanges].sort(
      (a, b) => Math.abs(b.change) - Math.abs(a.change),
    )[0];

    if (Math.abs(biggestChange.change) >= SEGMENT_CHANGE_THRESHOLD) {
      const direction = biggestChange.change > 0 ? "meningkat" : "menurun";

      insights.push({
        type: "crm_segment_change",

        severity:
          biggestChange.code === "AT_RISK" && biggestChange.change > 0
            ? "warning"
            : "info",

        title: "Perubahan Segmen Customer",

        message: `Proporsi ${biggestChange.code} ${direction} ${Math.abs(biggestChange.change)} percentage point dibanding analisis sebelumnya.`,

        data: {
          segmentChange: biggestChange,

          threshold: SEGMENT_CHANGE_THRESHOLD,
        },
      });
    }
  }

  return {
    analysis: {
      id: analysis.id,

      name: analysis.analysis_name,

      startDate: analysis.start_date,

      endDate: analysis.end_date,

      referenceDate: analysis.reference_date,

      totalCustomers: analysis.total_customers,
    },

    previousAnalysis: previousAnalysis
      ? {
          id: previousAnalysis.id,

          name: previousAnalysis.analysis_name,
        }
      : null,

    segmentDistribution,

    segmentChanges,

    topService,

    insights,
  };
};

// CREATE UNIQ INSIGHT NOTIFICATIONS
const generateCRMInsightNotifications = async (analysisRunId) => {
  const snapshot = await buildCRMInsightSnapshot(analysisRunId);

  const users = await User.findAll({
    where: {
      isActive: true,
    },

    attributes: ["id"],
  });

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    for (const insight of snapshot.insights) {
      const existing = await Notification.findOne({
        where: {
          userId: user.id,

          notificationType: insight.type,

          referenceType: "analysis",

          referenceId: analysisRunId,
        },
      });

      if (existing) {
        skipped++;

        continue;
      }

      await Notification.create({
        userId: user.id,

        notificationType: insight.type,

        title: insight.title,

        message: insight.message,

        referenceType: "analysis",

        referenceId: analysisRunId,

        isRead: false,

        readAt: null,
      });

      created++;
    }
  }

  return {
    analysisRunId: Number(analysisRunId),

    generatedInsights: snapshot.insights.length,

    notifications: {
      created,
      skipped,
    },

    insights: snapshot.insights,
  };
};

module.exports = {
  buildCRMInsightSnapshot,
  generateCRMInsightNotifications,
};
