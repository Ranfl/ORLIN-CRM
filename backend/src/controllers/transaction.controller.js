const { Op } = require("sequelize");

const sequelize = require("../config/database");

const {
  User,
  Customer,
  Service,
  Transaction,
  TransactionDetail,
} = require("../models");

const generateTransactionCode = require("../utils/transactionCode");

// DATE VALIDATION HELPERS

/**
 * Validasi tanggal dengan format ketat YYYY-MM-DD.
 *
 * Valid:
 * 2026-01-31
 *
 * Tidak valid:
 * 2026/01/31
 * 2026-1-31
 * 2026-02-31
 */
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

// GET ALL TRANSACTIONS
const getTransactions = async (req, res, next) => {
  try {
    // Pagination
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const offset = (page - 1) * limit;

    // Query params
    const search = req.query.search?.trim() || "";

    const startDate = req.query.startDate?.trim() || "";

    const endDate = req.query.endDate?.trim() || "";

    // Date validation
    if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Format startDate dan endDate harus YYYY-MM-DD.",
      });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate tidak boleh lebih besar dari endDate.",
      });
    }

    // Build WHERE
    const where = {};

    // Search transaction code
    if (search) {
      where.transactionCode = {
        [Op.like]: `%${search}%`,
      };
    }

    // Date filter
    // startDate + endDate
    if (startDate && endDate) {
      where.transactionDate = {
        [Op.between]: [
          new Date(`${startDate}T00:00:00`),

          new Date(`${endDate}T23:59:59`),
        ],
      };
    }

    // startDate tok
    else if (startDate) {
      where.transactionDate = {
        [Op.gte]: new Date(`${startDate}T00:00:00`),
      };
    }

    // endDate tok
    else if (endDate) {
      where.transactionDate = {
        [Op.lte]: new Date(`${endDate}T23:59:59`),
      };
    }

    // Query
    const { count, rows } = await Transaction.findAndCountAll({
      where,

      include: [
        {
          model: Customer,

          as: "customer",

          attributes: ["id", "customerCode", "name", "whatsapp", "email"],
        },

        {
          model: User,

          as: "creator",

          attributes: ["id", "name", "username"],
        },

        {
          model: TransactionDetail,

          as: "items",

          attributes: ["id", "quantity", "unitPrice", "subtotal"],

          include: [
            {
              model: Service,

              as: "service",

              attributes: ["id", "serviceCode", "serviceName"],
            },
          ],
        },
      ],

      order: [["transaction_date", "DESC"]],

      limit,
      offset,

      distinct: true,
    });

    // Response
    return res.status(200).json({
      success: true,

      data: {
        transactions: rows,

        pagination: {
          page,

          limit,

          totalData: count,

          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET TRANSACTION DETAIL
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        {
          model: Customer,

          as: "customer",
        },

        {
          model: User,

          as: "creator",

          attributes: ["id", "name", "username"],
        },

        {
          model: TransactionDetail,

          as: "items",

          include: [
            {
              model: Service,

              as: "service",
            },
          ],
        },
      ],
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaksi tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

// CREATE TRANSACTION
const createTransaction = async (req, res, next) => {
  const dbTransaction = await sequelize.transaction();

  try {
    const { customerId, transactionDate, items } = req.body;

    // Transaction date validation
    const parsedTransactionDate = new Date(transactionDate);

    if (Number.isNaN(parsedTransactionDate.getTime())) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Tanggal transaksi tidak valid.",
      });
    }

    // Items validation
    if (!Array.isArray(items) || items.length === 0) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Minimal satu layanan harus dipilih.",
      });
    }

    // Customer validation
    const customer = await Customer.findOne({
      where: {
        id: customerId,

        isActive: true,
      },

      transaction: dbTransaction,
    });

    if (!customer) {
      await dbTransaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Pelanggan aktif tidak ditemukan",
      });
    }

    // Prevent duplicate services
    const serviceIds = items.map((item) => Number(item.serviceId));

    if (serviceIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Service ID tidak valid.",
      });
    }

    if (new Set(serviceIds).size !== serviceIds.length) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Layanan yang sama tidak boleh dimasukkan dua kali",
      });
    }

    // Get services from DB
    const services = await Service.findAll({
      where: {
        id: serviceIds,

        isActive: true,
      },

      transaction: dbTransaction,
    });

    if (services.length !== serviceIds.length) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Salah satu layanan tidak ditemukan atau tidak aktif",
      });
    }

    // Build transaction details
    let totalAmount = 0;

    const details = [];

    for (const item of items) {
      const service = services.find(
        (service) => Number(service.id) === Number(item.serviceId),
      );

      const quantity = Number(item.quantity || 1);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        await dbTransaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Quantity layanan harus berupa bilangan bulat lebih dari 0.",
        });
      }

      // Harga SELALU dari database
      const unitPrice = Number(service.price);

      const subtotal = unitPrice * quantity;

      totalAmount += subtotal;

      details.push({
        serviceId: service.id,

        quantity,

        unitPrice,

        subtotal,
      });
    }

    // Generate unique code
    let transactionCode;

    let codeExists = true;

    while (codeExists) {
      transactionCode = generateTransactionCode();

      codeExists = await Transaction.findOne({
        where: {
          transactionCode,
        },

        transaction: dbTransaction,
      });
    }

    // Create header
    const transaction = await Transaction.create(
      {
        transactionCode,

        customerId,

        transactionDate: parsedTransactionDate,

        totalAmount,

        source: "manual",

        createdBy: req.user.id,
      },
      {
        transaction: dbTransaction,
      },
    );

    // Create details
    const transactionDetails = details.map((item) => ({
      ...item,

      transactionId: transaction.id,
    }));

    await TransactionDetail.bulkCreate(transactionDetails, {
      transaction: dbTransaction,
    });

    await dbTransaction.commit();

    // Get complete transaction
    const completeTransaction = await Transaction.findByPk(transaction.id, {
      include: [
        {
          model: Customer,

          as: "customer",
        },

        {
          model: TransactionDetail,

          as: "items",

          include: [
            {
              model: Service,

              as: "service",
            },
          ],
        },
      ],
    });

    return res.status(201).json({
      success: true,

      message: "Transaksi berhasil disimpan",

      data: {
        transaction: completeTransaction,
      },
    });
  } catch (error) {
    if (!dbTransaction.finished) {
      await dbTransaction.rollback();
    }

    next(error);
  }
};

// UPDATE TRANSACTION
const updateTransaction = async (req, res, next) => {
  const dbTransaction = await sequelize.transaction();

  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      transaction: dbTransaction,
    });

    if (!transaction) {
      await dbTransaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Transaksi tidak ditemukan",
      });
    }

    const { customerId, transactionDate, items } = req.body;

    // Transaction date validation
    const parsedTransactionDate = new Date(transactionDate);

    if (Number.isNaN(parsedTransactionDate.getTime())) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Tanggal transaksi tidak valid.",
      });
    }

    // Items validation
    if (!Array.isArray(items) || items.length === 0) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Minimal satu layanan harus dipilih.",
      });
    }

    // Customer validation
    const customer = await Customer.findOne({
      where: {
        id: customerId,

        isActive: true,
      },

      transaction: dbTransaction,
    });

    if (!customer) {
      await dbTransaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Pelanggan aktif tidak ditemukan",
      });
    }

    // Service validation
    const serviceIds = items.map((item) => Number(item.serviceId));

    if (serviceIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Service ID tidak valid.",
      });
    }

    if (new Set(serviceIds).size !== serviceIds.length) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Layanan yang sama tidak boleh dimasukkan dua kali",
      });
    }

    const services = await Service.findAll({
      where: {
        id: serviceIds,

        isActive: true,
      },

      transaction: dbTransaction,
    });

    if (services.length !== serviceIds.length) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Salah satu layanan tidak valid",
      });
    }

    // Build details
    let totalAmount = 0;

    const details = [];

    for (const item of items) {
      const service = services.find(
        (service) => Number(service.id) === Number(item.serviceId),
      );

      const quantity = Number(item.quantity || 1);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        await dbTransaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Quantity layanan harus berupa bilangan bulat lebih dari 0.",
        });
      }

      const unitPrice = Number(service.price);

      const subtotal = unitPrice * quantity;

      totalAmount += subtotal;

      details.push({
        transactionId: transaction.id,

        serviceId: service.id,

        quantity,

        unitPrice,

        subtotal,
      });
    }

    // Update transaction header
    await transaction.update(
      {
        customerId,

        transactionDate: parsedTransactionDate,

        totalAmount,
      },
      {
        transaction: dbTransaction,
      },
    );

    // Replace details
    await TransactionDetail.destroy({
      where: {
        transactionId: transaction.id,
      },

      transaction: dbTransaction,
    });

    await TransactionDetail.bulkCreate(details, {
      transaction: dbTransaction,
    });

    await dbTransaction.commit();

    // Get complete result
    const updatedTransaction = await Transaction.findByPk(transaction.id, {
      include: [
        {
          model: Customer,

          as: "customer",
        },

        {
          model: TransactionDetail,

          as: "items",

          include: [
            {
              model: Service,

              as: "service",
            },
          ],
        },
      ],
    });

    return res.status(200).json({
      success: true,

      message: "Transaksi berhasil diperbarui",

      data: {
        transaction: updatedTransaction,
      },
    });
  } catch (error) {
    if (!dbTransaction.finished) {
      await dbTransaction.rollback();
    }

    next(error);
  }
};

// DELETE TRANSACTION
// OWNER ONLY
const deleteTransaction = async (req, res, next) => {
  const dbTransaction = await sequelize.transaction();

  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      transaction: dbTransaction,
    });

    if (!transaction) {
      await dbTransaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Transaksi tidak ditemukan",
      });
    }

    await transaction.destroy({
      transaction: dbTransaction,
    });

    await dbTransaction.commit();

    return res.status(200).json({
      success: true,

      message: "Transaksi berhasil dihapus",
    });
  } catch (error) {
    if (!dbTransaction.finished) {
      await dbTransaction.rollback();
    }

    next(error);
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
