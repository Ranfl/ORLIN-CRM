const sequelize = require("../config/database");

const { QueryTypes } = require("sequelize");

// RESOLVE REPORT PERIOD
const resolvePeriod = async (startDate = null, endDate = null) => {
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
          MIN(transaction_date),
          '%Y-%m-%d'
        ) AS minDate,

        DATE_FORMAT(
          MAX(transaction_date),
          '%Y-%m-%d'
        ) AS maxDate

      FROM transactions
      `,
    {
      type: QueryTypes.SELECT,
    },
  );

  const minDate = rows[0]?.minDate;

  const maxDate = rows[0]?.maxDate;

  if (!minDate || !maxDate) {
    const error = new Error("Belum ada transaksi untuk membuat laporan.");

    error.status = 400;

    throw error;
  }

  return {
    startDate: startDate || minDate,

    endDate: endDate || maxDate,
  };
};

// OVERVIEW REPORT
const getOverviewReport = async (startDate, endDate) => {
  const transactionRows = await sequelize.query(
    `
      SELECT

        COUNT(*) AS totalTransactions,

        COUNT(
          DISTINCT customer_id
        ) AS uniqueCustomers,

        COALESCE(
          SUM(total_amount),
          0
        ) AS totalRevenue,

        COALESCE(
          AVG(total_amount),
          0
        ) AS averageTransactionValue,

        COALESCE(
          MIN(total_amount),
          0
        ) AS minimumTransaction,

        COALESCE(
          MAX(total_amount),
          0
        ) AS maximumTransaction

      FROM transactions

      WHERE
        transaction_date
        BETWEEN :startDate
        AND :endDate
      `,
    {
      replacements: {
        startDate: `${startDate} 00:00:00`,

        endDate: `${endDate} 23:59:59`,
      },

      type: QueryTypes.SELECT,
    },
  );

  const newCustomerRows = await sequelize.query(
    `
      SELECT
        COUNT(*) AS totalNewCustomers

      FROM (

        SELECT
          customer_id,
          MIN(transaction_date)
            AS firstTransaction

        FROM transactions

        GROUP BY customer_id

        HAVING
          MIN(transaction_date)
          BETWEEN :startDate
          AND :endDate

      ) AS first_transactions
      `,
    {
      replacements: {
        startDate: `${startDate} 00:00:00`,

        endDate: `${endDate} 23:59:59`,
      },

      type: QueryTypes.SELECT,
    },
  );

  const customerRows = await sequelize.query(
    `
      SELECT

        COUNT(*) AS totalCustomers,

        SUM(
          CASE
            WHEN is_active = 1
            THEN 1
            ELSE 0
          END
        ) AS activeCustomers,

        SUM(
          CASE
            WHEN is_active = 0
            THEN 1
            ELSE 0
          END
        ) AS inactiveCustomers

      FROM customers
      `,
    {
      type: QueryTypes.SELECT,
    },
  );

  return {
    totalCustomers: Number(customerRows[0]?.totalCustomers || 0),

    activeCustomers: Number(customerRows[0]?.activeCustomers || 0),

    inactiveCustomers: Number(customerRows[0]?.inactiveCustomers || 0),

    uniqueCustomers: Number(transactionRows[0]?.uniqueCustomers || 0),

    newCustomers: Number(newCustomerRows[0]?.totalNewCustomers || 0),

    totalTransactions: Number(transactionRows[0]?.totalTransactions || 0),

    totalRevenue: Number(transactionRows[0]?.totalRevenue || 0),

    averageTransactionValue: Number(
      Number(transactionRows[0]?.averageTransactionValue || 0).toFixed(2),
    ),

    minimumTransaction: Number(transactionRows[0]?.minimumTransaction || 0),

    maximumTransaction: Number(transactionRows[0]?.maximumTransaction || 0),
  };
};

// TRANSACTION REPORT
const getTransactionReport = async (startDate, endDate) => {
  // Monthly trend
  const monthlyTrend = await sequelize.query(
    `
      SELECT

        DATE_FORMAT(
          transaction_date,
          '%Y-%m'
        ) AS month,

        COUNT(*) AS totalTransactions,

        COUNT(
          DISTINCT customer_id
        ) AS uniqueCustomers,

        COALESCE(
          SUM(total_amount),
          0
        ) AS revenue,

        COALESCE(
          AVG(total_amount),
          0
        ) AS averageTransactionValue

      FROM transactions

      WHERE
        transaction_date
        BETWEEN :startDate
        AND :endDate

      GROUP BY
        DATE_FORMAT(
          transaction_date,
          '%Y-%m'
        )

      ORDER BY
        month ASC
      `,
    {
      replacements: {
        startDate: `${startDate} 00:00:00`,

        endDate: `${endDate} 23:59:59`,
      },

      type: QueryTypes.SELECT,
    },
  );

  // Top services
  const topServices = await sequelize.query(
    `
      SELECT

        s.id,

        s.service_code
          AS serviceCode,

        s.service_name
          AS serviceName,

        SUM(td.quantity)
          AS totalQuantity,

        COUNT(
          DISTINCT t.id
        ) AS totalTransactions,

        COALESCE(
          SUM(td.subtotal),
          0
        ) AS revenue

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

      LIMIT 10
      `,
    {
      replacements: {
        startDate: `${startDate} 00:00:00`,

        endDate: `${endDate} 23:59:59`,
      },

      type: QueryTypes.SELECT,
    },
  );

  // Top customers
  const topCustomers = await sequelize.query(
    `
      SELECT

        c.id,

        c.customer_code
          AS customerCode,

        c.name,

        COUNT(t.id)
          AS totalTransactions,

        COALESCE(
          SUM(t.total_amount),
          0
        ) AS totalSpending

      FROM transactions t

      INNER JOIN customers c
        ON t.customer_id = c.id

      WHERE
        t.transaction_date
        BETWEEN :startDate
        AND :endDate

      GROUP BY
        c.id,
        c.customer_code,
        c.name

      ORDER BY
        totalSpending DESC,
        totalTransactions DESC

      LIMIT 10
      `,
    {
      replacements: {
        startDate: `${startDate} 00:00:00`,

        endDate: `${endDate} 23:59:59`,
      },

      type: QueryTypes.SELECT,
    },
  );

  return {
    monthlyTrend: monthlyTrend.map((row) => ({
      month: row.month,

      totalTransactions: Number(row.totalTransactions),

      uniqueCustomers: Number(row.uniqueCustomers),

      revenue: Number(row.revenue),

      averageTransactionValue: Number(
        Number(row.averageTransactionValue).toFixed(2),
      ),
    })),

    topServices: topServices.map((row) => ({
      id: Number(row.id),

      serviceCode: row.serviceCode,

      serviceName: row.serviceName,

      totalQuantity: Number(row.totalQuantity),

      totalTransactions: Number(row.totalTransactions),

      revenue: Number(row.revenue),
    })),

    topCustomers: topCustomers.map((row) => ({
      id: Number(row.id),

      customerCode: row.customerCode,

      name: row.name,

      totalTransactions: Number(row.totalTransactions),

      totalSpending: Number(row.totalSpending),
    })),
  };
};

// RESOLVE ANALYSIS
const resolveAnalysis = async (analysisRunId = null) => {
  let query = `
      SELECT

        id,

        analysis_name
          AS analysisName,

        start_date
          AS startDate,

        end_date
          AS endDate,

        reference_date
          AS referenceDate,

        total_customers
          AS totalCustomers,

        model_version
          AS modelVersion,

        k_value
          AS kValue,

        silhouette_score
          AS silhouetteScore,

        davies_bouldin_index
          AS daviesBouldinIndex,

        calinski_harabasz_index
          AS calinskiHarabaszScore,

        status

      FROM analysis_runs

      WHERE
        status = 'completed'
    `;

  const replacements = {};

  if (analysisRunId) {
    query += `
        AND id = :analysisRunId
      `;

    replacements.analysisRunId = analysisRunId;
  }

  query += `
      ORDER BY
        reference_date DESC,
        created_at DESC,
        id DESC

      LIMIT 1
    `;

  const rows = await sequelize.query(query, {
    replacements,

    type: QueryTypes.SELECT,
  });

  return rows.length > 0 ? rows[0] : null;
};

// SEGMENTATION REPORT
const getSegmentationReport = async (analysisRunId = null) => {
  const analysis = await resolveAnalysis(analysisRunId);

  if (!analysis) {
    return {
      analysis: null,

      distribution: [],
    };
  }

  const rows = await sequelize.query(
    `
        SELECT

          s.segment_code
            AS code,

          s.segment_name
            AS name,

          s.default_objective
            AS objective,

          COUNT(*)
            AS total,

          COALESCE(
            AVG(r.recency),
            0
          ) AS averageRecency,

          COALESCE(
            AVG(r.frequency),
            0
          ) AS averageFrequency,

          COALESCE(
            AVG(r.monetary),
            0
          ) AS averageMonetary

        FROM cluster_results cr

        INNER JOIN segments s
          ON cr.segment_id = s.id

        INNER JOIN rfm_results r
          ON cr.rfm_result_id = r.id

        WHERE
          cr.analysis_run_id
          =
          :analysisRunId

        GROUP BY
          s.id,
          s.segment_code,
          s.segment_name,
          s.default_objective

        ORDER BY
          total DESC
        `,
    {
      replacements: {
        analysisRunId: analysis.id,
      },

      type: QueryTypes.SELECT,
    },
  );

  const grandTotal = rows.reduce((total, row) => total + Number(row.total), 0);

  return {
    analysis: {
      id: Number(analysis.id),

      analysisName: analysis.analysisName,

      startDate: analysis.startDate,

      endDate: analysis.endDate,

      referenceDate: analysis.referenceDate,

      totalCustomers: Number(analysis.totalCustomers),

      modelVersion: analysis.modelVersion,

      kValue: Number(analysis.kValue),

      metrics: {
        silhouetteScore: Number(analysis.silhouetteScore),

        daviesBouldinIndex: Number(analysis.daviesBouldinIndex),

        calinskiHarabaszScore: Number(analysis.calinskiHarabaszScore),
      },
    },

    distribution: rows.map((row) => ({
      code: row.code,

      name: row.name,

      objective: row.objective,

      total: Number(row.total),

      percentage:
        grandTotal > 0
          ? Number(((Number(row.total) / grandTotal) * 100).toFixed(2))
          : 0,

      rfm: {
        averageRecency: Number(Number(row.averageRecency).toFixed(2)),

        averageFrequency: Number(Number(row.averageFrequency).toFixed(2)),

        averageMonetary: Number(Number(row.averageMonetary).toFixed(2)),
      },
    })),
  };
};

// CAMPAIGN REPORT
const getCampaignReport = async (startDate, endDate) => {
  const rows = await sequelize.query(
    `
        SELECT

          c.id,

          c.campaign_code
            AS campaignCode,

          c.campaign_name
            AS campaignName,

          c.status,

          c.delivery_mode
            AS deliveryMode,

          c.promotion_type
            AS promotionType,

          c.promotion_value
            AS promotionValue,

          c.promotion_unit
            AS promotionUnit,

          c.start_datetime
            AS startDatetime,

          c.end_datetime
            AS endDatetime,

          s.segment_code
            AS segmentCode,

          s.segment_name
            AS segmentName,

          ps.strategy_name
            AS strategyName,

          (
            SELECT COUNT(*)
            FROM campaign_targets ct
            WHERE
              ct.campaign_id = c.id
          ) AS totalTargets,

          (
            SELECT COUNT(*)
            FROM campaign_delivery_logs cdl
            WHERE
              cdl.campaign_id = c.id
              AND cdl.status = 'sent'
          ) AS sentCount,

          (
            SELECT COUNT(*)
            FROM campaign_delivery_logs cdl
            WHERE
              cdl.campaign_id = c.id
              AND cdl.status = 'simulated'
          ) AS simulatedCount,

          (
            SELECT COUNT(*)
            FROM campaign_delivery_logs cdl
            WHERE
              cdl.campaign_id = c.id
              AND cdl.status = 'failed'
          ) AS failedCount

        FROM campaigns c

        LEFT JOIN segments s
          ON c.segment_id = s.id

        LEFT JOIN promotion_strategies ps
          ON c.promotion_strategy_id = ps.id

        WHERE
          c.start_datetime
          BETWEEN :startDate
          AND :endDate

        ORDER BY
          c.start_datetime DESC
        `,
    {
      replacements: {
        startDate: `${startDate} 00:00:00`,

        endDate: `${endDate} 23:59:59`,
      },

      type: QueryTypes.SELECT,
    },
  );

  return rows.map((row) => ({
    id: Number(row.id),

    campaignCode: row.campaignCode,

    campaignName: row.campaignName,

    status: row.status,

    deliveryMode: row.deliveryMode,

    promotionType: row.promotionType,

    promotionValue:
      row.promotionValue !== null ? Number(row.promotionValue) : null,

    promotionUnit: row.promotionUnit,

    startDatetime: row.startDatetime,

    endDatetime: row.endDatetime,

    segmentCode: row.segmentCode,

    segmentName: row.segmentName,

    strategyName: row.strategyName,

    totalTargets: Number(row.totalTargets),

    sent: Number(row.sentCount),

    simulated: Number(row.simulatedCount),

    failed: Number(row.failedCount),
  }));
};

// RESOLVE CAMPAIGN REPORT PERIOD
const resolveCampaignReportPeriod =
  async () => {

    const rows =
      await sequelize.query(
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
          type:
            QueryTypes.SELECT,
        }
      );


    const startDate =
      rows[0]?.minDate
      || null;

    const endDate =
      rows[0]?.maxDate
      || null;


    if (
      !startDate ||
      !endDate
    ) {
      return null;
    }


    return {
      startDate,
      endDate,
    };
  };

// FULL REPORT SUMMARY
const buildReportSummary =
  async ({
    startDate = null,
    endDate = null,
    analysisRunId = null,
  }) => {

    // Periode transaksi
    const transactionPeriod =
      await resolvePeriod(
        startDate,
        endDate
      );

    // Periode campaign
    let campaignPeriod =
      null;

    if (
      startDate ||
      endDate
    ) {

      const defaultCampaignPeriod =
        await resolveCampaignReportPeriod();


      if (
        defaultCampaignPeriod
      ) {

        campaignPeriod = {

          startDate:
            startDate
            ||
            defaultCampaignPeriod
              .startDate,

          endDate:
            endDate
            ||
            defaultCampaignPeriod
              .endDate,
        };
      }

    } else {
      campaignPeriod =
        await resolveCampaignReportPeriod();
    }

    // Query utama
    const [
      overview,
      transactions,
      segmentation,
    ] =
      await Promise.all([

        getOverviewReport(
          transactionPeriod.startDate,
          transactionPeriod.endDate
        ),

        getTransactionReport(
          transactionPeriod.startDate,
          transactionPeriod.endDate
        ),

        getSegmentationReport(
          analysisRunId
        ),
      ]);

    // Campaign query
    let campaigns =
      [];


    if (
      campaignPeriod
    ) {

      campaigns =
        await getCampaignReport(
          campaignPeriod.startDate,
          campaignPeriod.endDate
        );
    }


    return {

      periods: {

        transactions:
          transactionPeriod,

        campaigns:
          campaignPeriod,
      },

      overview,

      transactions,

      segmentation,

      campaigns,
    };
  };

module.exports = {
  resolvePeriod,
  resolveCampaignReportPeriod,
  getOverviewReport,
  getTransactionReport,
  getSegmentationReport,
  getCampaignReport,
  buildReportSummary,
};