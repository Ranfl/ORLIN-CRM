const sequelize = require("../config/database");

const { QueryTypes } = require("sequelize");

// DATE HELPERS
const formatDateUTC = (date) => {
  return date.toISOString().slice(0, 10);
};

const subtractDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() - days);

  return formatDateUTC(date);
};

const getTrendStartDate = (referenceDate) => {
  const date = new Date(`${referenceDate}T00:00:00Z`);

  // mundur 11 bulan supaya total trend 12 bulan
  date.setUTCMonth(date.getUTCMonth() - 11);

  date.setUTCDate(1);

  return formatDateUTC(date);
};

// RESOLVE REFERENCE DATE
const resolveReferenceDate = async (requestedReferenceDate = null) => {
  if (requestedReferenceDate) {
    return requestedReferenceDate;
  }

  const rows = await sequelize.query(
    `
        SELECT
          DATE_FORMAT(
            MAX(transaction_date),
            '%Y-%m-%d'
          ) AS referenceDate
        FROM transactions
        `,
    {
      type: QueryTypes.SELECT,
    },
  );

  if (!rows[0]?.referenceDate) {
    const error = new Error("Belum ada transaksi untuk membentuk dashboard.");

    error.status = 400;

    throw error;
  }

  return rows[0].referenceDate;
};

// MAIN KPI
const getMainKPI = async ({ weekStart, referenceDate }) => {
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
        ) AS activeCustomers

      FROM customers
      `,
    {
      type: QueryTypes.SELECT,
    },
  );

  const transactionRows = await sequelize.query(
    `
      SELECT

        COUNT(*) AS totalTransactions,

        COALESCE(
          SUM(total_amount),
          0
        ) AS totalRevenue,

        COALESCE(
          AVG(total_amount),
          0
        ) AS averageTransactionValue

      FROM transactions
      `,
    {
      type: QueryTypes.SELECT,
    },
  );

  // Customer baru berdasarkan transaksi pertama
  const newCustomerRows = await sequelize.query(
    `
      SELECT
        COUNT(*) AS totalNewCustomers

      FROM (

        SELECT
          customer_id,
          MIN(transaction_date)
            AS firstTransactionDate

        FROM transactions

        GROUP BY
          customer_id

        HAVING
          MIN(transaction_date)
          BETWEEN :startDate
          AND :endDate

      ) AS first_transactions
      `,
    {
      replacements: {
        startDate: `${weekStart} 00:00:00`,

        endDate: `${referenceDate} 23:59:59`,
      },

      type: QueryTypes.SELECT,
    },
  );

  return {
    totalCustomers: Number(customerRows[0]?.totalCustomers || 0),

    activeCustomers: Number(customerRows[0]?.activeCustomers || 0),

    totalTransactions: Number(transactionRows[0]?.totalTransactions || 0),

    totalRevenue: Number(transactionRows[0]?.totalRevenue || 0),

    averageTransactionValue: Number(
      Number(transactionRows[0]?.averageTransactionValue || 0).toFixed(2),
    ),

    newCustomersThisWeek: Number(newCustomerRows[0]?.totalNewCustomers || 0),
  };
};

// LATEST COMPLETED ANALYSIS
const getLatestAnalysis = async () => {
  const rows = await sequelize.query(
    `
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

          preprocessing,

          k_value
            AS kValue,

          silhouette_score
            AS silhouetteScore,

          davies_bouldin_index
            AS daviesBouldinIndex,

          calinski_harabasz_index
            AS calinskiHarabaszScore,

          status,

          created_at
            AS createdAt

        FROM analysis_runs

        WHERE status = 'completed'

        ORDER BY
          reference_date DESC,
          created_at DESC,
          id DESC

        LIMIT 1
        `,
    {
      type: QueryTypes.SELECT,
    },
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    ...rows[0],

    id: Number(rows[0].id),

    totalCustomers: Number(rows[0].totalCustomers || 0),

    kValue: Number(rows[0].kValue || 0),

    silhouetteScore:
      rows[0].silhouetteScore !== null ? Number(rows[0].silhouetteScore) : null,

    daviesBouldinIndex:
      rows[0].daviesBouldinIndex !== null
        ? Number(rows[0].daviesBouldinIndex)
        : null,

    calinskiHarabaszScore:
      rows[0].calinskiHarabaszScore !== null
        ? Number(rows[0].calinskiHarabaszScore)
        : null,
  };
};

// SEGMENT DISTRIBUTION
const getSegmentDistribution = async (analysisRunId) => {
  if (!analysisRunId) {
    return [];
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
            AS total

        FROM cluster_results cr

        INNER JOIN segments s
          ON cr.segment_id = s.id

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
        analysisRunId,
      },

      type: QueryTypes.SELECT,
    },
  );

  const grandTotal = rows.reduce((total, row) => total + Number(row.total), 0);

  return rows.map((row) => ({
    code: row.code,

    name: row.name,

    objective: row.objective,

    total: Number(row.total),

    percentage:
      grandTotal > 0
        ? Number(((Number(row.total) / grandTotal) * 100).toFixed(2))
        : 0,
  }));
};

// TOP SERVICE - LAST 30 DAYS
const getTopService = async ({ startDate, referenceDate }) => {
  const rows = await sequelize.query(
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
          )
            AS totalTransactions,

          COALESCE(
            SUM(td.subtotal),
            0
          )
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

        endDate: `${referenceDate} 23:59:59`,
      },

      type: QueryTypes.SELECT,
    },
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    id: Number(rows[0].id),

    serviceCode: rows[0].serviceCode,

    serviceName: rows[0].serviceName,

    totalQuantity: Number(rows[0].totalQuantity),

    totalTransactions: Number(rows[0].totalTransactions),

    revenue: Number(rows[0].revenue),
  };
};

// 12 MONTH TRANSACTION / REVENUE TREND
const getTransactionTrend = async ({ trendStartDate, referenceDate }) => {
  const rows = await sequelize.query(
    `
        SELECT

          DATE_FORMAT(
            transaction_date,
            '%Y-%m'
          ) AS month,

          COUNT(*)
            AS transactions,

          COALESCE(
            SUM(total_amount),
            0
          ) AS revenue

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
        startDate: `${trendStartDate} 00:00:00`,

        endDate: `${referenceDate} 23:59:59`,
      },

      type: QueryTypes.SELECT,
    },
  );

  return rows.map((row) => ({
    month: row.month,

    transactions: Number(row.transactions),

    revenue: Number(row.revenue),
  }));
};

// RECENT CAMPAIGNS
const getRecentCampaigns = async () => {
  const rows = await sequelize.query(
    `
        SELECT

          c.id,

          c.campaign_code
            AS campaignCode,

          c.campaign_name
            AS campaignName,

          c.delivery_mode
            AS deliveryMode,

          c.status,

          c.start_datetime
            AS startDatetime,

          c.end_datetime
            AS endDatetime,

          s.segment_code
            AS segmentCode,

          s.segment_name
            AS segmentName

        FROM campaigns c

        LEFT JOIN segments s
          ON c.segment_id = s.id

        ORDER BY
          c.created_at DESC

        LIMIT 5
        `,
    {
      type: QueryTypes.SELECT,
    },
  );

  return rows.map((row) => ({
    ...row,

    id: Number(row.id),
  }));
};

// RECENT NOTIFICATIONS
const getRecentNotifications = async (userId) => {
  const rows = await sequelize.query(
    `
        SELECT

          id,

          notification_type
            AS notificationType,

          title,

          message,

          reference_type
            AS referenceType,

          reference_id
            AS referenceId,

          is_read
            AS isRead,

          created_at
            AS createdAt,

          read_at
            AS readAt

        FROM notifications

        WHERE user_id = :userId

        ORDER BY
          created_at DESC,
          id DESC

        LIMIT 5
        `,
    {
      replacements: {
        userId,
      },

      type: QueryTypes.SELECT,
    },
  );

  return rows.map((row) => ({
    ...row,

    id: Number(row.id),

    referenceId: row.referenceId !== null ? Number(row.referenceId) : null,

    isRead: Boolean(row.isRead),
  }));
};

// UNREAD NOTIFICATION COUNT
const getUnreadNotificationCount = async (userId) => {
  const rows = await sequelize.query(
    `
        SELECT
          COUNT(*)
            AS total

        FROM notifications

        WHERE
          user_id = :userId
          AND is_read = 0
        `,
    {
      replacements: {
        userId,
      },

      type: QueryTypes.SELECT,
    },
  );

  return Number(rows[0]?.total || 0);
};

// DASHBOARD SUMMARY
const buildDashboardSummary = async ({
  userId,
  requestedReferenceDate = null,
}) => {
  const referenceDate = await resolveReferenceDate(requestedReferenceDate);

  const weekStart = subtractDays(referenceDate, 6);

  const servicePeriodStart = subtractDays(referenceDate, 29);

  const trendStartDate = getTrendStartDate(referenceDate);

  const latestAnalysis = await getLatestAnalysis();

  // Jalankan query independen paralel
  const [
    kpi,
    segmentDistribution,
    topService,
    transactionTrend,
    recentCampaigns,
    recentNotifications,
    unreadNotifications,
  ] = await Promise.all([
    getMainKPI({
      weekStart,
      referenceDate,
    }),

    getSegmentDistribution(latestAnalysis?.id),

    getTopService({
      startDate: servicePeriodStart,

      referenceDate,
    }),

    getTransactionTrend({
      trendStartDate,
      referenceDate,
    }),

    getRecentCampaigns(),

    getRecentNotifications(userId),

    getUnreadNotificationCount(userId),
  ]);

  return {
    referenceDate,

    periods: {
      newCustomer: {
        startDate: weekStart,

        endDate: referenceDate,
      },

      topService: {
        startDate: servicePeriodStart,

        endDate: referenceDate,
      },

      trend: {
        startDate: trendStartDate,

        endDate: referenceDate,
      },
    },

    kpi,

    analysis: latestAnalysis,

    segmentDistribution,

    topService,

    transactionTrend,

    recentCampaigns,

    notifications: {
      unreadCount: unreadNotifications,

      recent: recentNotifications,
    },
  };
};

module.exports = {
  buildDashboardSummary,
};
