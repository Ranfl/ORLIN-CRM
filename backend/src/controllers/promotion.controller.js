const { PromotionStrategy, Segment } = require("../models");

// GET PROMOTION STRATEGIES
const getPromotionStrategies = async (req, res, next) => {
  try {
    const where = {
      isActive: true,
    };

    const segmentWhere = {
      isActive: true,
    };

    if (req.query.segment) {
      segmentWhere.code = req.query.segment;
    }

    const strategies = await PromotionStrategy.findAll({
      where,

      include: [
        {
          model: Segment,
          as: "segment",
          required: true,
          where: segmentWhere,
        },
      ],

      order: [["id", "ASC"]],
    });

    return res.status(200).json({
      success: true,

      data: {
        strategies,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET STRATEGY DETAIL
const getPromotionStrategyById = async (req, res, next) => {
  try {
    const strategy = await PromotionStrategy.findByPk(req.params.id, {
      include: [
        {
          model: Segment,
          as: "segment",
        },
      ],
    });

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: "Strategi promosi tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        strategy,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPromotionStrategies,
  getPromotionStrategyById,
};
