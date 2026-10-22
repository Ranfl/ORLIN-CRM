const { Op, fn, col } = require("sequelize");

const {
  AnalysisRun,
  RfmResult,
  ClusterResult,
  Customer,
  Segment,
} = require("../models");

const { runRfmAnalysis } = require("../services/analysis.service");

// RUN ANALYSIS
const createAnalysis = async (req, res, next) => {
  try {
    const {
      name = "Baseline RFM ORLIN 2023-2026",

      startDate = "2023-07-01",

      endDate = "2026-06-30",

      referenceDate = "2026-06-30",
    } = req.body;

    const analysisRun = await runRfmAnalysis({
      name,

      startDate,

      endDate,

      referenceDate,

      userId: req.user.id,
    });

    const completedRun = await AnalysisRun.findByPk(analysisRun.id);

    return res.status(201).json({
      success: true,

      message: "Analisis RFM dan clustering berhasil.",

      data: {
        analysisRun: completedRun,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET ANALYSIS LIST
const getAnalyses = async (req, res, next) => {
  try {
    const analyses = await AnalysisRun.findAll({
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,

      data: {
        analyses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET ANALYSIS DETAIL
const getAnalysisById = async (req, res, next) => {
  try {
    const analysisRun = await AnalysisRun.findByPk(req.params.id, {
      include: [
        {
          model: ClusterResult,

          as: "clusterResults",

          include: [
            {
              model: Customer,

              as: "customer",

              attributes: ["id", "customerCode", "name"],
            },

            {
              model: Segment,

              as: "segment",

              attributes: ["id", "code", "name", "defaultObjective"],
            },

            {
              model: RfmResult,

              as: "rfmResult",
            },
          ],
        },
      ],
    });

    if (!analysisRun) {
      return res.status(404).json({
        success: false,
        message: "Analysis run tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        analysisRun,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ANALYSIS SUMMARY
const getAnalysisSummary = async (
    req,
    res,
    next
) => {

    try {

        const analysisRun =
            await AnalysisRun.findByPk(
                req.params.id
            );


        if (!analysisRun) {

            return res.status(404).json({
                success: false,
                message:
                    'Analysis run tidak ditemukan.'
            });
        }


        if (
            analysisRun.status !==
            'completed'
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Analysis run belum selesai.'
            });
        }

        // Segment Distribution
        const clusterResults =
            await ClusterResult.findAll({

                where: {
                    analysisRunId:
                        analysisRun.id
                },

                include: [
                    {
                        model:
                            Segment,

                        as:
                            'segment',

                        attributes: [
                            'id',
                            'code',
                            'name',
                            'defaultObjective'
                        ]
                    }
                ]
            });


        const segmentCounter =
            new Map();


        for (
            const result
            of clusterResults
        ) {

            const segment =
                result.segment;


            if (!segment) {
                continue;
            }


            if (
                !segmentCounter.has(
                    segment.code
                )
            ) {

                segmentCounter.set(
                    segment.code,
                    {
                        code:
                            segment.code,

                        name:
                            segment.name,

                        objective:
                            segment.defaultObjective,

                        total:
                            0
                    }
                );
            }


            segmentCounter
                .get(
                    segment.code
                )
                .total++;
        }


        const totalCustomers =
            Number(
                analysisRun.totalCustomers
            ) || 0;


        const segmentDistribution =
            Array.from(
                segmentCounter.values()
            )
            .map(
                segment => ({

                    ...segment,

                    percentage:
                        totalCustomers > 0
                            ? Number(
                                (
                                    (
                                        segment.total /
                                        totalCustomers
                                    )
                                    * 100
                                ).toFixed(2)
                            )
                            : 0
                })
            )
            .sort(
                (a, b) =>
                    b.total - a.total
            );


        // RFM Results
        const rfmResults =
            await RfmResult.findAll({

                where: {
                    analysisRunId:
                        analysisRun.id
                },

                attributes: [
                    'recency',
                    'frequency',
                    'monetary'
                ]
            });


        const recencies =
            rfmResults.map(
                row =>
                    Number(
                        row.recency
                    )
            );


        const frequencies =
            rfmResults.map(
                row =>
                    Number(
                        row.frequency
                    )
            );


        const monetaries =
            rfmResults.map(
                row =>
                    Number(
                        row.monetary
                    )
            );


        const calculateStats = (
            values
        ) => {

            if (
                values.length === 0
            ) {

                return {
                    min: 0,
                    max: 0,
                    average: 0,
                    total: 0
                };
            }


            const total =
                values.reduce(
                    (
                        sum,
                        value
                    ) =>
                        sum + value,
                    0
                );


            return {
                min:
                    Math.min(
                        ...values
                    ),

                max:
                    Math.max(
                        ...values
                    ),

                average:
                    Number(
                        (
                            total /
                            values.length
                        ).toFixed(2)
                    ),

                total
            };
        };


        const recencyStats =
            calculateStats(
                recencies
            );


        const frequencyStats =
            calculateStats(
                frequencies
            );


        const monetaryStats =
            calculateStats(
                monetaries
            );


        // Response
        return res.status(200).json({

            success: true,

            data: {

                analysis: {
                    id:
                        analysisRun.id,

                    name:
                        analysisRun.name,

                    startDate:
                        analysisRun.startDate,

                    endDate:
                        analysisRun.endDate,

                    referenceDate:
                        analysisRun.referenceDate,

                    totalCustomers,

                    modelVersion:
                        analysisRun.modelVersion,

                    preprocessing:
                        analysisRun.preprocessing,

                    kValue:
                        analysisRun.kValue,

                    status:
                        analysisRun.status
                },


                metrics: {

                    silhouetteScore:
                        Number(
                            analysisRun
                                .silhouetteScore
                        ),

                    daviesBouldinIndex:
                        Number(
                            analysisRun
                                .daviesBouldinIndex
                        ),

                    calinskiHarabaszScore:
                        Number(
                            analysisRun
                                .calinskiHarabaszScore
                        )
                },


                segmentDistribution,


                rfmStatistics: {

                    recency: {
                        min:
                            recencyStats.min,

                        max:
                            recencyStats.max,

                        average:
                            recencyStats.average
                    },

                    frequency: {
                        min:
                            frequencyStats.min,

                        max:
                            frequencyStats.max,

                        average:
                            frequencyStats.average,

                        totalVisits:
                            frequencyStats.total
                    },

                    monetary: {
                        min:
                            monetaryStats.min,

                        max:
                            monetaryStats.max,

                        average:
                            monetaryStats.average,

                        total:
                            monetaryStats.total
                    }
                }
            }
        });


    } catch (error) {

        next(error);
    }
};

// ANALYSIS CUSTOMER LIST
const getAnalysisCustomers = async (
    req,
    res,
    next
) => {

    try {

        const analysisRun =
            await AnalysisRun.findByPk(
                req.params.id
            );


        if (!analysisRun) {

            return res.status(404).json({
                success: false,
                message:
                    'Analysis run tidak ditemukan.'
            });
        }


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
                    ) || 10,
                    1
                ),
                100
            );


        const offset =
            (
                page - 1
            ) * limit;


        const search =
            req.query.search
                ?.trim() || '';


        const segmentCode =
            req.query.segment
                ?.trim();


        // Customer Filter
        const customerWhere =
            {};


        if (search) {

            customerWhere[
                Op.or
            ] = [

                {
                    name: {
                        [Op.like]:
                            `%${search}%`
                    }
                },

                {
                    customerCode: {
                        [Op.like]:
                            `%${search}%`
                    }
                }
            ];
        }

        // Segment Filter
        const segmentWhere =
            {};


        if (segmentCode) {

            segmentWhere.code =
                segmentCode;
        }


        const {
            count,
            rows
        } =
            await ClusterResult
                .findAndCountAll({

                    where: {
                        analysisRunId:
                            analysisRun.id
                    },

                    include: [

                        {
                            model:
                                Customer,

                            as:
                                'customer',

                            required:
                                true,

                            where:
                                customerWhere,

                            attributes: [
                                'id',
                                'customerCode',
                                'name',
                                'whatsapp',
                                'email'
                            ]
                        },

                        {
                            model:
                                Segment,

                            as:
                                'segment',

                            required:
                                true,

                            where:
                                segmentWhere,

                            attributes: [
                                'id',
                                'code',
                                'name',
                                'defaultObjective'
                            ]
                        },

                        {
                            model:
                                RfmResult,

                            as:
                                'rfmResult',

                            required:
                                true,

                            attributes: [
                                'lastTransactionDate',
                                'recency',
                                'frequency',
                                'monetary'
                            ]
                        }
                    ],

                    limit,

                    offset,

                    distinct:
                        true,

                    order: [
                        [
                            {
                                model:
                                    RfmResult,

                                as:
                                    'rfmResult'
                            },

                            'monetary',

                            'DESC'
                        ]
                    ]
                });


        return res.status(200).json({

            success: true,

            data: {

                customers:
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

// CUSTOMER INTELLIGENCE DETAIL
const getAnalysisCustomerById = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await ClusterResult.findOne({

                where: {

                    analysisRunId:
                        req.params.id,

                    customerId:
                        req.params.customerId
                },

                include: [

                    {
                        model:
                            Customer,

                        as:
                            'customer',

                        attributes: [
                            'id',
                            'customerCode',
                            'name',
                            'whatsapp',
                            'email',
                            'isActive'
                        ]
                    },

                    {
                        model:
                            Segment,

                        as:
                            'segment',

                        attributes: [
                            'id',
                            'code',
                            'name',
                            'description',
                            'defaultObjective'
                        ]
                    },

                    {
                        model:
                            RfmResult,

                        as:
                            'rfmResult',

                        attributes: [
                            'lastTransactionDate',
                            'recency',
                            'frequency',
                            'monetary'
                        ]
                    }
                ]
            });


        if (!result) {

            return res.status(404).json({
                success: false,
                message:
                    'Hasil analisis customer tidak ditemukan.'
            });
        }


        return res.status(200).json({

            success: true,

            data: {

                customer:
                    result.customer,

                rfm:
                    result.rfmResult,

                clustering: {

                    clusterNumber:
                        result.clusterNumber,

                    silhouetteValue:
                        result.silhouetteValue,

                    segment:
                        result.segment
                }
            }
        });


    } catch (error) {

        next(error);
    }
};

module.exports = {
  createAnalysis,
  getAnalyses,
  getAnalysisById,

  getAnalysisSummary,
  getAnalysisCustomers,
  getAnalysisCustomerById,
};