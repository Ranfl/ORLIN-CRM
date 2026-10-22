const { Op } = require("sequelize");

const Customer = require("../models/Customer");

const generateCustomerCode = require("../utils/customerCode");

// GET ALL CUSTOMERS
const getCustomers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

    const offset = (page - 1) * limit;

    const search = req.query.search?.trim() || "";

    const status = req.query.status || "active";

    const where = {};

    if (status === "active") {
      where.isActive = true;
    }

    if (status === "inactive") {
      where.isActive = false;
    }

    if (search) {
      where[Op.or] = [
        {
          customerCode: {
            [Op.like]: `%${search}%`,
          },
        },

        {
          name: {
            [Op.like]: `%${search}%`,
          },
        },

        {
          whatsapp: {
            [Op.like]: `%${search}%`,
          },
        },

        {
          email: {
            [Op.like]: `%${search}%`,
          },
        },
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where,

      limit,

      offset,

      order: [["created_at", "DESC"]],
    });

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,

      data: {
        customers: rows,

        pagination: {
          page,
          limit,
          totalData: count,
          totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET CUSTOMER DETAIL
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

// CREATE CUSTOMER
const createCustomer = async (req, res, next) => {
  try {
    const { name, whatsapp, email } = req.body;

    let customerCode;

    let exists = true;

    while (exists) {
      customerCode = generateCustomerCode();

      exists = await Customer.findOne({
        where: {
          customerCode,
        },
      });
    }

    const customer = await Customer.create({
      customerCode,

      name: name.trim(),

      whatsapp: whatsapp?.trim() || null,

      email: email || null,

      isActive: true,
    });

    return res.status(201).json({
      success: true,

      message: "Pelanggan berhasil ditambahkan",

      data: {
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE CUSTOMER
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan",
      });
    }

    const { name, whatsapp, email } = req.body;

    await customer.update({
      name: name.trim(),

      whatsapp: whatsapp?.trim() || null,

      email: email || null,
    });

    return res.status(200).json({
      success: true,

      message: "Data pelanggan berhasil diperbarui",

      data: {
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

// DEACTIVATE CUSTOMER
const deactivateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan",
      });
    }

    if (!customer.isActive) {
      return res.status(400).json({
        success: false,
        message: "Pelanggan sudah tidak aktif",
      });
    }

    await customer.update({
      isActive: false,
    });

    return res.status(200).json({
      success: true,

      message: "Pelanggan berhasil dinonaktifkan",
    });
  } catch (error) {
    next(error);
  }
};

// REACTIVATE CUSTOMER
const reactivateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Pelanggan tidak ditemukan",
      });
    }

    if (customer.isActive) {
      return res.status(400).json({
        success: false,
        message: "Pelanggan sudah aktif",
      });
    }

    await customer.update({
      isActive: true,
    });

    return res.status(200).json({
      success: true,

      message: "Pelanggan berhasil diaktifkan kembali",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  reactivateCustomer,
};
