const { Op } = require("sequelize");

const Service = require("../models/Service");

const generateServiceCode = require("../utils/serviceCode");

// GET ALL SERVICES
const getServices = async (req, res, next) => {
  try {
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
          serviceCode: {
            [Op.like]: `%${search}%`,
          },
        },

        {
          serviceName: {
            [Op.like]: `%${search}%`,
          },
        },
      ];
    }

    const services = await Service.findAll({
      where,

      order: [["service_name", "ASC"]],
    });

    return res.status(200).json({
      success: true,

      data: {
        services,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET SERVICE DETAIL
const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Layanan tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        service,
      },
    });
  } catch (error) {
    next(error);
  }
};

// CREATE SERVICE
const createService = async (req, res, next) => {
  try {
    const { serviceName, price } = req.body;

    const duplicateName = await Service.findOne({
      where: {
        serviceName: serviceName.trim(),
      },
    });

    if (duplicateName) {
      return res.status(409).json({
        success: false,
        message: "Nama layanan sudah tersedia",
      });
    }

    let serviceCode;
    let exists = true;

    while (exists) {
      serviceCode = generateServiceCode();

      exists = await Service.findOne({
        where: {
          serviceCode,
        },
      });
    }

    const service = await Service.create({
      serviceCode,

      serviceName: serviceName.trim(),

      price,

      isActive: true,
    });

    return res.status(201).json({
      success: true,

      message: "Layanan berhasil ditambahkan",

      data: {
        service,
      },
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE SERVICE
const updateService = async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Layanan tidak ditemukan",
      });
    }

    const { serviceName, price } = req.body;

    const duplicateName = await Service.findOne({
      where: {
        serviceName: serviceName.trim(),

        id: {
          [Op.ne]: service.id,
        },
      },
    });

    if (duplicateName) {
      return res.status(409).json({
        success: false,
        message: "Nama layanan sudah digunakan",
      });
    }

    await service.update({
      serviceName: serviceName.trim(),

      price,
    });

    return res.status(200).json({
      success: true,

      message: "Layanan berhasil diperbarui",

      data: {
        service,
      },
    });
  } catch (error) {
    next(error);
  }
};

// DEACTIVATE SERVICE
const deactivateService = async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Layanan tidak ditemukan",
      });
    }

    if (!service.isActive) {
      return res.status(400).json({
        success: false,
        message: "Layanan sudah tidak aktif",
      });
    }

    await service.update({
      isActive: false,
    });

    return res.status(200).json({
      success: true,

      message: "Layanan berhasil dinonaktifkan",
    });
  } catch (error) {
    next(error);
  }
};

// REACTIVATE SERVICE
const reactivateService = async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Layanan tidak ditemukan",
      });
    }

    if (service.isActive) {
      return res.status(400).json({
        success: false,
        message: "Layanan sudah aktif",
      });
    }

    await service.update({
      isActive: true,
    });

    return res.status(200).json({
      success: true,

      message: "Layanan berhasil diaktifkan kembali",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deactivateService,
  reactivateService,
};
