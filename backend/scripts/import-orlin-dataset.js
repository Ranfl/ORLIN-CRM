require("dotenv").config();

const path = require("path");
const XLSX = require("xlsx");
const { Op } = require("sequelize");

const sequelize = require("../src/config/database");

const {
  Customer,
  Service,
  Transaction,
  TransactionDetail,
} = require("../src/models");


// CONFIG
const DATASET_PATH = path.join(
  __dirname,
  "..",
  "data",
  "Dataset Orlin Salon 2023 2026 2.xlsx",
);

const DUMMY_EMAIL = process.env.DUMMY_EMAIL;

const DUMMY_WHATSAPP = process.env.DUMMY_WHATSAPP;


// HELPERS
const normalizeText = (value) => {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
};

const parseAmount = (value) => {
  if (typeof value === "number") {
    return value;
  }

  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");

  const result = Number(cleaned);

  if (Number.isNaN(result)) {
    return 0;
  }

  return result;
};

const normalizeDate = (value) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    const year = value.getFullYear();

    const month = String(value.getMonth() + 1).padStart(2, "0");

    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Tanggal tidak valid: ${value}`);
  }

  const year = parsed.getFullYear();

  const month = String(parsed.getMonth() + 1).padStart(2, "0");

  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createHistoricalDateTime = (dateKey) => {
  return new Date(`${dateKey}T12:00:00+07:00`);
};

// MAIN IMPORT
const runImport = async () => {
  let dbTransaction;

  try {
    console.log("\n==============================================");

    console.log("ORLIN HISTORICAL DATASET IMPORT");

    console.log("==============================================\n");

    if (!DUMMY_EMAIL) {
      throw new Error("DUMMY_EMAIL belum diisi pada .env");
    }

    if (!DUMMY_WHATSAPP) {
      throw new Error("DUMMY_WHATSAPP belum diisi pada .env");
    }

    // DB Connection
    await sequelize.authenticate();

    console.log("✅ Database connected.");

    // Prevent duplicate historical import
    const historicalCount = await Transaction.count({
      where: {
        source: "historical_import",
      },
    });

    if (historicalCount > 0) {
      throw new Error(
        `Historical import sudah pernah dilakukan (${historicalCount} transaksi ditemukan).`,
      );
    }

    // Read Excel
    console.log("📂 Reading dataset...");

    const workbook = XLSX.readFile(DATASET_PATH, {
      cellDates: true,
    });

    const sheet = workbook.Sheets["Transaksi"];

    if (!sheet) {
      throw new Error('Sheet "Transaksi" tidak ditemukan.');
    }

    /*
     * Dataset ORLIN:
     *
     * Row 1 = title
     * Row 2 = blank
     * Row 3 = actual headers
     *
     * range: 2 berarti mulai dari row Excel ke-3.
     */

    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      range: 2,
      defval: null,
      raw: false,
      dateNF: "yyyy-mm-dd",
    });

    console.log(`✅ Raw rows found: ${rawRows.length.toLocaleString()}`);

    // Normalize data
    const rows = rawRows
      .map((row, index) => {
        const customerName = normalizeText(row["Nama Pelanggan"]);

        const serviceName = normalizeText(row["Jenis Layanan"]);

        const transactionDate = normalizeDate(row["Tanggal Transaksi"]);

        const amount = parseAmount(row["Jumlah Transaksi_Rp"]);

        return {
          rowNumber: index + 4,

          customerName,

          serviceName,

          transactionDate,

          amount,
        };
      })
      .filter(
        (row) => row.customerName && row.serviceName && row.transactionDate,
      );

    if (rows.length !== rawRows.length) {
      console.warn(
        `⚠️ Ada ${rawRows.length - rows.length} row kosong/tidak valid yang dilewati.`,
      );
    }

    // Dataset summary before import
    const customerNames = [...new Set(rows.map((row) => row.customerName))];

    const serviceNames = [...new Set(rows.map((row) => row.serviceName))];

    const rawTotal = rows.reduce((total, row) => total + row.amount, 0);

    console.log("\n--------- SOURCE SUMMARY ---------");

    console.log(`Customers       : ${customerNames.length}`);

    console.log(`Services        : ${serviceNames.length}`);

    console.log(`Service rows    : ${rows.length.toLocaleString()}`);

    console.log(`Total monetary  : Rp${rawTotal.toLocaleString("id-ID")}`);

    // Build historical visits
    //
    // Customer + Date = 1 Visit
    const visitMap = new Map();

    for (const row of rows) {
      const key = `${row.customerName}|||${row.transactionDate}`;

      if (!visitMap.has(key)) {
        visitMap.set(key, {
          customerName: row.customerName,

          transactionDate: row.transactionDate,

          totalAmount: 0,

          items: [],
        });
      }

      const visit = visitMap.get(key);

      visit.totalAmount += row.amount;

      visit.items.push({
        serviceName: row.serviceName,

        unitPrice: row.amount,

        quantity: 1,

        subtotal: row.amount,
      });
    }

    const visits = [...visitMap.values()].sort((a, b) => {
      if (a.transactionDate !== b.transactionDate) {
        return a.transactionDate.localeCompare(b.transactionDate);
      }

      return a.customerName.localeCompare(b.customerName);
    });

    console.log(`Visits          : ${visits.length.toLocaleString()}`);

    // Expected dataset validation
    console.log("\n--------- PRE-IMPORT VALIDATION ---------");

    const validations = [
      {
        label: "Customer count",

        actual: customerNames.length,

        expected: 200,
      },

      {
        label: "Service count",

        actual: serviceNames.length,

        expected: 16,
      },

      {
        label: "Visit count",

        actual: visits.length,

        expected: 5006,
      },

      {
        label: "Detail count",

        actual: rows.length,

        expected: 6284,
      },

      {
        label: "Historical monetary",

        actual: rawTotal,

        expected: 1353685000,
      },
    ];

    let validationFailed = false;

    for (const validation of validations) {
      const valid = validation.actual === validation.expected;

      console.log(
        `${valid ? "✅" : "❌"} ` +
          `${validation.label}: ` +
          `${validation.actual.toLocaleString("id-ID")} ` +
          `(expected ${validation.expected.toLocaleString("id-ID")})`,
      );

      if (!valid) {
        validationFailed = true;
      }
    }

    if (validationFailed) {
      throw new Error(
        "Dataset tidak sesuai expected baseline. Import dibatalkan.",
      );
    }

    // Begin database transaction
    dbTransaction = await sequelize.transaction();

    // CUSTOMERS
    console.log("\n👤 Importing customers...");

    const customerMap = new Map();

    for (let i = 0; i < customerNames.length; i++) {
      const name = customerNames[i];

      let customer = await Customer.findOne({
        where: {
          name,
        },
        transaction: dbTransaction,
      });

      if (!customer) {
        const customerCode = `CUS-HIST-${String(i + 1).padStart(4, "0")}`;

        customer = await Customer.create(
          {
            customerCode,

            name,

            whatsapp: DUMMY_WHATSAPP,

            email: DUMMY_EMAIL,

            isActive: true,
          },
          {
            transaction: dbTransaction,
          },
        );
      }

      customerMap.set(name, customer);
    }

    console.log(`✅ Customers mapped: ${customerMap.size}`);

    // SERVICES
    console.log("✂️ Importing services...");

    /*
     * Harga master service diambil dari harga TERAKHIR yang muncul di historical transaction.
     * Historical detail tetap memakai harga asli masing-masing transaksi.
     */

    const latestServicePrice = new Map();

    const sortedRows = [...rows].sort((a, b) =>
      a.transactionDate.localeCompare(b.transactionDate),
    );

    for (const row of sortedRows) {
      latestServicePrice.set(row.serviceName, row.amount);
    }

    const serviceMap = new Map();

    for (let i = 0; i < serviceNames.length; i++) {
      const name = serviceNames[i];

      let service = await Service.findOne({
        where: {
          serviceName: name,
        },
        transaction: dbTransaction,
      });

      if (!service) {
        const serviceCode = `SRV-HIST-${String(i + 1).padStart(3, "0")}`;

        service = await Service.create(
          {
            serviceCode,

            serviceName: name,

            price: latestServicePrice.get(name),

            isActive: true,
          },
          {
            transaction: dbTransaction,
          },
        );
      }

      serviceMap.set(name, service);
    }

    console.log(`✅ Services mapped: ${serviceMap.size}`);

    // PREPARE TRANSACTION HEADERS
    console.log("🧾 Building historical transactions...");

    const transactionHeaders = visits.map((visit, index) => {
      const customer = customerMap.get(visit.customerName);

      const code = `HIST-${visit.transactionDate.replaceAll("-", "")}-${String(
        index + 1,
      ).padStart(6, "0")}`;

      visit.transactionCode = code;

      return {
        transactionCode: code,

        customerId: customer.id,

        transactionDate: createHistoricalDateTime(visit.transactionDate),

        totalAmount: visit.totalAmount,

        source: "historical_import",

        createdBy: null,
      };
    });

    await Transaction.bulkCreate(transactionHeaders, {
      transaction: dbTransaction,
    });

    // Get inserted transaction IDs
    const insertedTransactions = await Transaction.findAll({
      where: {
        transactionCode: {
          [Op.in]: transactionHeaders.map((row) => row.transactionCode),
        },
      },

      transaction: dbTransaction,
    });

    const transactionMap = new Map(
      insertedTransactions.map((transaction) => [
        transaction.transactionCode,
        transaction,
      ]),
    );

    if (transactionMap.size !== visits.length) {
      throw new Error("Jumlah transaction hasil insert tidak sesuai.");
    }

    // BUILD DETAILS
    console.log("🧾 Building transaction details...");

    const detailRows = [];

    for (const visit of visits) {
      const transaction = transactionMap.get(visit.transactionCode);

      for (const item of visit.items) {
        const service = serviceMap.get(item.serviceName);

        detailRows.push({
          transactionId: transaction.id,

          serviceId: service.id,

          quantity: item.quantity,

          unitPrice: item.unitPrice,

          subtotal: item.subtotal,
        });
      }
    }

    if (detailRows.length !== 6284) {
      throw new Error(`Detail count tidak sesuai: ${detailRows.length}`);
    }

    const BATCH_SIZE = 1000;

    for (let i = 0; i < detailRows.length; i += BATCH_SIZE) {
      const batch = detailRows.slice(i, i + BATCH_SIZE);

      await TransactionDetail.bulkCreate(batch, {
        transaction: dbTransaction,
      });

      console.log(
        `   Detail inserted: ${Math.min(
          i + BATCH_SIZE,
          detailRows.length,
        )}/${detailRows.length}`,
      );
    }

    // POST IMPORT VALIDATION
    console.log("\n--------- DATABASE VALIDATION ---------");

    const importedTransactionCount = await Transaction.count({
      where: {
        source: "historical_import",
      },

      transaction: dbTransaction,
    });

    const importedDetailCount = await TransactionDetail.count({
      include: [
        {
          model: Transaction,

          as: "transaction",

          required: true,

          where: {
            source: "historical_import",
          },

          attributes: [],
        },
      ],

      transaction: dbTransaction,
    });

    const importedTransactions = await Transaction.findAll({
      where: {
        source: "historical_import",
      },

      attributes: ["totalAmount"],

      transaction: dbTransaction,
    });

    const importedTotal = importedTransactions.reduce(
      (sum, trx) => sum + Number(trx.totalAmount),
      0,
    );

    const importedCustomerCount = await Transaction.count({
      where: {
        source: "historical_import",
      },

      distinct: true,

      col: "customer_id",

      transaction: dbTransaction,
    });

    console.log(`Transactions : ${importedTransactionCount.toLocaleString()}`);

    console.log(`Details      : ${importedDetailCount.toLocaleString()}`);

    console.log(`Customers    : ${importedCustomerCount.toLocaleString()}`);

    console.log(`Monetary     : Rp${importedTotal.toLocaleString("id-ID")}`);

    if (
      importedTransactionCount !== 5006 ||
      importedDetailCount !== 6284 ||
      importedCustomerCount !== 200 ||
      importedTotal !== 1353685000
    ) {
      throw new Error(
        "Post-import validation gagal. Semua perubahan akan di-rollback.",
      );
    }

    // COMMIT
    await dbTransaction.commit();

    console.log("\n==============================================");

    console.log("✅ HISTORICAL IMPORT SUCCESS");

    console.log("==============================================");

    console.log("Customers    : 200");

    console.log("Services     : 16");

    console.log("Transactions : 5,006");

    console.log("Details      : 6,284");

    console.log("Monetary     : Rp1,353,685,000");

    console.log("\n✅ Semua data tervalidasi.");

    process.exit(0);
  } catch (error) {
    if (dbTransaction && !dbTransaction.finished) {
      await dbTransaction.rollback();

      console.log("\n↩️ Database transaction rolled back.");
    }

    console.error("\n❌ IMPORT FAILED");

    console.error(error.message);

    process.exit(1);
  }
};

runImport();
