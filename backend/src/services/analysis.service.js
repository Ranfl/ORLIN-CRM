const { Op } = require("sequelize");

const sequelize = require("../config/database");

const {
  Transaction,
  AnalysisRun,
  RfmResult,
  Segment,
  ClusterResult,
} = require("../models");

const { analyzeRfm } = require("./ml.service");

// DATE HELPER
const formatDateJakarta = (date) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",

    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  }).format(date);
};

// RUN RFM ANALYSIS
const runRfmAnalysis = async ({
  name,
  startDate,
  endDate,
  referenceDate,
  userId,
}) => {
  let analysisRun = null;

  try {
    // Validate date range
    if (new Date(referenceDate) < new Date(endDate)) {
      throw new Error("Reference date tidak boleh sebelum end date.");
    }

    // Create analysis run
    analysisRun = await AnalysisRun.create({
      name,

      startDate,

      endDate,

      referenceDate,

      modelVersion: "kmeans-v1",

      preprocessing: "StandardScaler",

      kValue: 4,

      status: "processing",

      createdBy: userId,
    });

    // Fetch transactions
    const transactions = await Transaction.findAll({
      where: {
        transactionDate: {
          [Op.between]: [
            new Date(`${startDate}T00:00:00+07:00`),

            new Date(`${endDate}T23:59:59+07:00`),
          ],
        },
      },

      attributes: ["id", "customerId", "transactionDate", "totalAmount"],

      order: [["transactionDate", "ASC"]],
    });

    if (transactions.length === 0) {
      throw new Error("Tidak ada transaksi pada periode analisis.");
    }

    // Build ML payload
    const mlTransactions = transactions.map((transaction) => ({
      transaction_id: Number(transaction.id),

      customer_id: Number(transaction.customerId),

      transaction_date: formatDateJakarta(transaction.transactionDate),

      total_amount: Number(transaction.totalAmount),
    }));

    console.log(
      `Sending ${mlTransactions.length} transactions to ML Service...`,
    );

    // Call FastAPI
    const mlResult = await analyzeRfm({
      referenceDate,

      transactions: mlTransactions,
    });

    console.log(`ML returned ${mlResult.total_customers} customers.`);

    // Segment master
    const segments = await Segment.findAll();

    const segmentMap = new Map(
      segments.map((segment) => [segment.code, segment]),
    );

    const requiredSegments = ["VVIP", "LOYAL", "AT_RISK", "INACTIVE"];

    for (const code of requiredSegments) {
      if (!segmentMap.has(code)) {
        throw new Error(`Master segment ${code} tidak ditemukan.`);
      }
    }

    // Save RFM + cluster atomically
    const dbTransaction = await sequelize.transaction();

    try {
      for (const result of mlResult.results) {
        const rfmResult = await RfmResult.create(
          {
            analysisRunId: analysisRun.id,

            customerId: result.customer_id,

            lastTransactionDate: result.last_transaction_date,

            recency: result.recency,

            frequency: result.frequency,

            monetary: result.monetary,
          },
          {
            transaction: dbTransaction,
          },
        );

        const segment = segmentMap.get(result.segment_code);

        await ClusterResult.create(
          {
            analysisRunId: analysisRun.id,

            customerId: result.customer_id,

            rfmResultId: rfmResult.id,

            clusterNumber: result.cluster,

            segmentId: segment.id,

            silhouetteValue: result.silhouette_value,
          },
          {
            transaction: dbTransaction,
          },
        );
      }

      // Mark completed
      await analysisRun.update(
        {
          totalCustomers: mlResult.total_customers,

          silhouetteScore: mlResult.metrics.silhouette_score,

          daviesBouldinIndex: mlResult.metrics.davies_bouldin_index,

          calinskiHarabaszScore: mlResult.metrics.calinski_harabasz_score,

          modelVersion: mlResult.model_version,

          status: "completed",

          errorMessage: null,
        },
        {
          transaction: dbTransaction,
        },
      );

      await dbTransaction.commit();
    } catch (error) {
      if (!dbTransaction.finished) {
        await dbTransaction.rollback();
      }

      throw error;
    }

    return analysisRun;
  } catch (error) {
    console.error("RFM Analysis failed:", error.message);

    if (analysisRun && analysisRun.status !== "completed") {
      await analysisRun.update({
        status: "failed",

        errorMessage: error.message,
      });
    }

    throw error;
  }
};

module.exports = {
  runRfmAnalysis,
};
