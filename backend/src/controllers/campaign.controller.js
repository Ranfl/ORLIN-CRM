const sequelize = require("../config/database");

const {
  Campaign,
  CampaignTarget,
  PromotionStrategy,
  AnalysisRun,
  Segment,
  ClusterResult,
  Customer,
  User,
} = require("../models");

const generateCampaignCode = require("../utils/campaignCode");

const { CampaignDeliveryLog } = require("../models");

const {
  simulateCampaignDelivery,
  testCampaignDelivery,
} = require("../services/campaignDelivery.service");

const {
  scheduleCampaign,
  startCampaign,
  completeCampaign,
  cancelCampaign,
} = require("../services/campaignLifecycle.service");

// DELIVERY LOG LIST
const getDeliveryLogs = async (
    req,
    res,
    next
) => {

    try {

        const page =
            Math.max(
                parseInt(
                    req.query.page
                ) || 1,
                1
            );


        const limit =
            Math.min(
                Math.max(
                    parseInt(
                        req.query.limit
                    ) || 20,
                    1
                ),
                100
            );


        const offset =
            (
                page - 1
            ) * limit;


        const where = {
            campaignId:
                req.params.id
        };


        if (
            req.query.channel
        ) {

            where.channel =
                req.query.channel;
        }


        if (
            req.query.status
        ) {

            where.status =
                req.query.status;
        }


        const {
            count,
            rows
        } =
            await CampaignDeliveryLog
                .findAndCountAll({

                    where,

                    include: [
                        {
                            model:
                                Customer,

                            as:
                                'customer',

                            attributes: [
                                'id',
                                'customerCode',
                                'name'
                            ]
                        }
                    ],

                    limit,

                    offset,

                    order: [
                        [
                            'id',
                            'ASC'
                        ]
                    ]
                });


        return res.status(200).json({

            success: true,

            data: {

                logs:
                    rows,

                pagination: {

                    page,

                    limit,

                    totalData:
                        count,

                    totalPages:
                        Math.ceil(
                            count / limit
                        )
                }
            }
        });


    } catch (error) {

        next(error);
    }
};

// CREATE CAMPAIGN
const createCampaign = async (req, res, next) => {
  try {
    const {
      campaignName,
      analysisRunId,
      segmentCode,
      promotionStrategyId = null,

      promotionType,
      promotionValue = null,
      promotionUnit = null,

      offerDescription = null,

      startDatetime,
      endDatetime,

      whatsappEnabled = false,
      emailEnabled = false,

      whatsappMessage = null,
      emailSubject = null,
      emailBody = null,

      deliveryMode = "simulation",
    } = req.body;

    if (
      !campaignName ||
      !analysisRunId ||
      !segmentCode ||
      !promotionType ||
      !startDatetime ||
      !endDatetime
    ) {
      return res.status(400).json({
        success: false,
        message: "Data campaign belum lengkap.",
      });
    }

    const analysisRun = await AnalysisRun.findOne({
      where: {
        id: analysisRunId,
        status: "completed",
      },
    });

    if (!analysisRun) {
      return res.status(400).json({
        success: false,
        message: "Analysis run tidak valid atau belum completed.",
      });
    }

    const segment = await Segment.findOne({
      where: {
        code: segmentCode,
        isActive: true,
      },
    });

    if (!segment) {
      return res.status(404).json({
        success: false,
        message: "Segment tidak ditemukan.",
      });
    }

    let promotionStrategy = null;

    if (promotionStrategyId) {
      promotionStrategy = await PromotionStrategy.findOne({
        where: {
          id: promotionStrategyId,

          segmentId: segment.id,

          isActive: true,
        },
      });

      if (!promotionStrategy) {
        return res.status(400).json({
          success: false,
          message: "Strategi promosi tidak sesuai dengan segment.",
        });
      }
    }

    const start = new Date(startDatetime);

    const end = new Date(endDatetime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Tanggal campaign tidak valid.",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "End datetime harus setelah start datetime.",
      });
    }

    if (
      promotionUnit === "percent" &&
      (Number(promotionValue) < 0 || Number(promotionValue) > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Persentase promosi harus antara 0 sampai 100.",
      });
    }

    let campaignCode;
    let exists = true;

    while (exists) {
      campaignCode = generateCampaignCode();

      exists = await Campaign.findOne({
        where: {
          campaignCode,
        },
      });
    }

    const campaign = await Campaign.create({
      campaignCode,

      campaignName: campaignName.trim(),

      analysisRunId: analysisRun.id,

      segmentId: segment.id,

      promotionStrategyId: promotionStrategy ? promotionStrategy.id : null,

      promotionType,

      promotionValue,

      promotionUnit,

      offerDescription,

      startDatetime: start,

      endDatetime: end,

      whatsappEnabled: Boolean(whatsappEnabled),

      emailEnabled: Boolean(emailEnabled),

      whatsappMessage,

      emailSubject,

      emailBody,

      deliveryMode,

      status: "draft",

      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,

      message: "Campaign berhasil dibuat.",

      data: {
        campaign,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET CAMPAIGNS
const getCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.findAll({
      include: [
        {
          model: AnalysisRun,

          as: "analysisRun",

          attributes: ["id", "name", "referenceDate"],
        },

        {
          model: Segment,

          as: "segment",

          attributes: ["id", "code", "name"],
        },

        {
          model: PromotionStrategy,

          as: "promotionStrategy",

          required: false,
        },

        {
          model: User,

          as: "creator",

          attributes: ["id", "name", "username"],
        },
      ],

      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,

      data: {
        campaigns,
      },
    });
  } catch (error) {
    next(error);
  }
};

// CAMPAIGN DETAIL
const getCampaignById = async (req, res, next) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id, {
      include: [
        {
          model: AnalysisRun,

          as: "analysisRun",
        },

        {
          model: Segment,

          as: "segment",
        },

        {
          model: PromotionStrategy,

          as: "promotionStrategy",
        },
      ],
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign tidak ditemukan.",
      });
    }

    const targetCount = await CampaignTarget.count({
      where: {
        campaignId: campaign.id,
      },
    });

    return res.status(200).json({
      success: true,

      data: {
        campaign,

        targetCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GENERATE / FREEZE TARGETS
const generateCampaignTargets = async (req, res, next) => {
  let dbTransaction;

  try {
    const campaign = await Campaign.findByPk(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign tidak ditemukan.",
      });
    }

    if (campaign.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Target hanya dapat dibuat saat campaign masih draft.",
      });
    }

    const existingTargets = await CampaignTarget.count({
      where: {
        campaignId: campaign.id,
      },
    });

    if (existingTargets > 0) {
      return res.status(409).json({
        success: false,
        message: "Target campaign sudah pernah dibuat dan telah dibekukan.",
      });
    }

    const clusterResults = await ClusterResult.findAll({
      where: {
        analysisRunId: campaign.analysisRunId,

        segmentId: campaign.segmentId,
      },

      attributes: ["customerId"],
    });

    if (clusterResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada customer pada segment campaign tersebut.",
      });
    }

    dbTransaction = await sequelize.transaction();

    const targets = clusterResults.map((result) => ({
      campaignId: campaign.id,

      customerId: result.customerId,

      segmentId: campaign.segmentId,

      analysisRunId: campaign.analysisRunId,
    }));

    await CampaignTarget.bulkCreate(targets, {
      transaction: dbTransaction,
    });

    await dbTransaction.commit();

    return res.status(201).json({
      success: true,

      message: "Target campaign berhasil dibuat dan dibekukan.",

      data: {
        campaignId: campaign.id,

        totalTargets: targets.length,
      },
    });
  } catch (error) {
    if (dbTransaction && !dbTransaction.finished) {
      await dbTransaction.rollback();
    }

    next(error);
  }
};

// SIMULATE DELIVERY
const simulateDelivery = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await simulateCampaignDelivery(
                req.params.id
            );


        return res.status(201).json({

            success: true,

            message:
                'Simulasi delivery campaign berhasil.',

            data:
                result
        });


    } catch (error) {

        if (
            error.status
        ) {

            return res
                .status(
                    error.status
                )
                .json({
                    success: false,
                    message:
                        error.message
                });
        }

        next(error);
    }
};

// DELIVERY SUMMARY
const getDeliverySummary = async (
    req,
    res,
    next
) => {

    try {

        const campaign =
            await Campaign.findByPk(
                req.params.id
            );


        if (!campaign) {

            return res.status(404).json({
                success: false,
                message:
                    'Campaign tidak ditemukan.'
            });
        }


        const logs =
            await CampaignDeliveryLog.findAll({

                where: {
                    campaignId:
                        campaign.id
                },

                attributes: [
                    'channel',
                    'status'
                ]
            });


        const summary = {

            total:
                logs.length,

            whatsapp: {
                total: 0,
                pending: 0,
                simulated: 0,
                sent: 0,
                failed: 0
            },

            email: {
                total: 0,
                pending: 0,
                simulated: 0,
                sent: 0,
                failed: 0
            }
        };


        for (
            const log
            of logs
        ) {

            const channel =
                summary[
                    log.channel
                ];


            channel.total++;


            if (
                channel[
                    log.status
                ] !== undefined
            ) {

                channel[
                    log.status
                ]++;
            }
        }


        return res.status(200).json({

            success: true,

            data: {

                campaign: {
                    id:
                        campaign.id,

                    campaignCode:
                        campaign.campaignCode,

                    campaignName:
                        campaign.campaignName,

                    deliveryMode:
                        campaign.deliveryMode,

                    status:
                        campaign.status
                },

                summary
            }
        });


    } catch (error) {

        next(error);
    }
};

// TEST DELIVERY
const testDelivery = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await testCampaignDelivery(
                req.params.id
            );


        return res.status(200).json({

            success: true,

            message:
                'Test delivery campaign selesai.',

            data:
                result
        });


    } catch (error) {

        if (
            error.status
        ) {

            return res
                .status(
                    error.status
                )
                .json({

                    success: false,

                    message:
                        error.message
                });
        }


        next(error);
    }
};

// CAMPAIGN LIFECYCLE
const schedule = async (req, res, next) => {
  try {
    const data = await scheduleCampaign(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Campaign berhasil dijadwalkan.",
      data,
    });
  } catch (error) {
    next(error);
  }
};


const start = async (req, res, next) => {
  try {
    const data = await startCampaign(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Campaign berhasil dimulai.",
      data,
    });
  } catch (error) {
    next(error);
  }
};


const complete = async (req, res, next) => {
  try {
    const data = await completeCampaign(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Campaign berhasil diselesaikan.",
      data,
    });
  } catch (error) {
    next(error);
  }
};


const cancel = async (req, res, next) => {
  try {
    const data = await cancelCampaign(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Campaign berhasil dibatalkan.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  generateCampaignTargets,
  simulateDelivery,
  testDelivery,
  getDeliverySummary,
  getDeliveryLogs,
  schedule,
  start,
  complete,
  cancel,
};