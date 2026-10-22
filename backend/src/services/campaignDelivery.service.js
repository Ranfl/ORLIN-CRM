const sequelize = require("../config/database");

const {
  Campaign,
  CampaignTarget,
  CampaignDeliveryLog,
  Customer,
  Segment,
} = require("../models");

// DELIVERY PROVIDERS
const { sendTestEmail } = require("./email.service");

const { sendTestWhatsApp } = require("./whatsapp.service");

// SIMULATE CAMPAIGN DELIVERY
const simulateCampaignDelivery = async (campaignId) => {
  const campaign = await Campaign.findByPk(campaignId, {
    include: [
      {
        model: Segment,
        as: "segment",
        attributes: ["id", "code", "name"],
      },
    ],
  });


  // Campaign validation
  if (!campaign) {
    const error = new Error("Campaign tidak ditemukan.");

    error.status = 404;

    throw error;
  }

  if (campaign.deliveryMode !== "simulation") {
    const error = new Error(
      "Campaign ini bukan menggunakan delivery mode simulation.",
    );

    error.status = 400;

    throw error;
  }

  if (campaign.status !== "draft") {
    const error = new Error(
      "Simulasi hanya dapat dilakukan saat campaign masih draft.",
    );

    error.status = 400;

    throw error;
  }

  // Channel validation
  if (!campaign.whatsappEnabled && !campaign.emailEnabled) {
    const error = new Error("Minimal satu channel campaign harus diaktifkan.");

    error.status = 400;

    throw error;
  }

  // Prevent duplicate delivery
  const existingLogs = await CampaignDeliveryLog.count({
    where: {
      campaignId: campaign.id,
    },
  });

  if (existingLogs > 0) {
    const error = new Error("Campaign ini sudah memiliki delivery log.");

    error.status = 409;

    throw error;
  }

  // Get frozen targets
  const targets = await CampaignTarget.findAll({
    where: {
      campaignId: campaign.id,
    },

    include: [
      {
        model: Customer,

        as: "customer",

        required: true,

        attributes: ["id", "name", "whatsapp", "email"],
      },
    ],

    order: [["customerId", "ASC"]],
  });

  if (targets.length === 0) {
    const error = new Error("Target campaign belum dibuat.");

    error.status = 400;

    throw error;
  }

  // Build simulation logs
  const logs = [];

  for (const target of targets) {
    const customer = target.customer;

    // WANGSAF
    if (campaign.whatsappEnabled) {
      const hasWhatsapp = Boolean(customer.whatsapp);

      logs.push({
        campaignId: campaign.id,

        customerId: customer.id,

        channel: "whatsapp",

        recipient: customer.whatsapp || "N/A",

        status: hasWhatsapp ? "simulated" : "failed",

        attemptNumber: 1,

        providerMessageId: hasWhatsapp
          ? `SIM-WA-${campaign.id}-${customer.id}`
          : null,

        errorMessage: hasWhatsapp
          ? null
          : "Nomor WhatsApp customer tidak tersedia.",

        sentAt: null,
      });
    }

    // EMAIL
    if (campaign.emailEnabled) {
      const hasEmail = Boolean(customer.email);

      logs.push({
        campaignId: campaign.id,

        customerId: customer.id,

        channel: "email",

        recipient: customer.email || "N/A",

        status: hasEmail ? "simulated" : "failed",

        attemptNumber: 1,

        providerMessageId: hasEmail
          ? `SIM-EMAIL-${campaign.id}-${customer.id}`
          : null,

        errorMessage: hasEmail ? null : "Email customer tidak tersedia.",

        sentAt: null,
      });
    }
  }

  // Atomic insert
  const dbTransaction = await sequelize.transaction();

  try {
    await CampaignDeliveryLog.bulkCreate(logs, {
      transaction: dbTransaction,
    });

    await dbTransaction.commit();
  } catch (error) {
    if (!dbTransaction.finished) {
      await dbTransaction.rollback();
    }

    throw error;
  }

  // Build summary
  const summary = {
    totalTargets: targets.length,

    totalDeliveryRecords: logs.length,

    whatsapp: {
      total: 0,
      simulated: 0,
      failed: 0,
    },

    email: {
      total: 0,
      simulated: 0,
      failed: 0,
    },
  };

  for (const log of logs) {
    const channel = summary[log.channel];

    channel.total++;

    if (log.status === "simulated") {
      channel.simulated++;
    }

    if (log.status === "failed") {
      channel.failed++;
    }
  }

  return {
    campaign: {
      id: campaign.id,

      campaignCode: campaign.campaignCode,

      campaignName: campaign.campaignName,

      deliveryMode: campaign.deliveryMode,

      segment: campaign.segment,
    },

    summary,
  };
};

// TEST CAMPAIGN DELIVERY
// Maksimal 1 WhatsApp + 1 Email
const testCampaignDelivery = async (campaignId) => {
  const campaign = await Campaign.findByPk(campaignId, {
    include: [
      {
        model: Segment,

        as: "segment",

        attributes: ["id", "code", "name"],
      },
    ],
  });

  // Campaign validation
  if (!campaign) {
    const error = new Error("Campaign tidak ditemukan.");

    error.status = 404;

    throw error;
  }

  if (campaign.deliveryMode !== "test") {
    const error = new Error(
      "Campaign ini bukan menggunakan delivery mode test.",
    );

    error.status = 400;

    throw error;
  }

  if (campaign.status !== "draft") {
    const error = new Error(
      "Test delivery hanya dapat dilakukan saat campaign masih draft.",
    );

    error.status = 400;

    throw error;
  }

  if (!campaign.whatsappEnabled && !campaign.emailEnabled) {
    const error = new Error("Minimal satu channel harus diaktifkan.");

    error.status = 400;

    throw error;
  }

  // Target wajib sudah dibekukan
  const firstTarget = await CampaignTarget.findOne({
    where: {
      campaignId: campaign.id,
    },

    order: [["id", "ASC"]],
  });

  if (!firstTarget) {
    const error = new Error("Target campaign belum dibuat.");

    error.status = 400;

    throw error;
  }


  // Prevent duplicate test delivery
  const existingLogs = await CampaignDeliveryLog.count({
    where: {
      campaignId: campaign.id,
    },
  });

  if (existingLogs > 0) {
    const error = new Error("Campaign ini sudah memiliki delivery log.");

    error.status = 409;

    throw error;
  }

  const results = {
    whatsapp: null,
    email: null,
  };

  // WANGSAF TEST
  if (campaign.whatsappEnabled) {
    try {
      const waResult = await sendTestWhatsApp({
        message:
          campaign.whatsappMessage ||
          campaign.offerDescription ||
          "Promo spesial dari ORLIN Salon.",
      });

      await CampaignDeliveryLog.create({
        campaignId: campaign.id,

        customerId: firstTarget.customerId,

        channel: "whatsapp",

        recipient: waResult.recipient,

        status: "sent",

        attemptNumber: 1,

        providerMessageId: waResult.messageId,

        errorMessage: null,

        sentAt: new Date(),
      });

      results.whatsapp = {
        success: true,

        recipient: waResult.recipient,

        messageId: waResult.messageId,
      };
    } catch (error) {
      const recipient = process.env.TEST_WHATSAPP_RECIPIENT || "N/A";

      await CampaignDeliveryLog.create({
        campaignId: campaign.id,

        customerId: firstTarget.customerId,

        channel: "whatsapp",

        recipient,

        status: "failed",

        attemptNumber: 1,

        providerMessageId: null,

        errorMessage: error.message,

        sentAt: null,
      });

      results.whatsapp = {
        success: false,

        recipient,

        error: error.message,
      };
    }
  }

  // EMAIL TEST
  if (campaign.emailEnabled) {
    try {
      const emailResult = await sendTestEmail({
        subject: campaign.emailSubject || "Promo ORLIN Salon",

        body:
          campaign.emailBody ||
          campaign.offerDescription ||
          "Promo spesial dari ORLIN Salon.",
      });

      await CampaignDeliveryLog.create({
        campaignId: campaign.id,

        customerId: firstTarget.customerId,

        channel: "email",

        recipient: emailResult.recipient,

        status: "sent",

        attemptNumber: 1,

        providerMessageId: emailResult.messageId,

        errorMessage: null,

        sentAt: new Date(),
      });

      results.email = {
        success: true,

        recipient: emailResult.recipient,

        messageId: emailResult.messageId,
      };
    } catch (error) {
      const recipient = process.env.TEST_EMAIL_RECIPIENT || "N/A";

      await CampaignDeliveryLog.create({
        campaignId: campaign.id,

        customerId: firstTarget.customerId,

        channel: "email",

        recipient,

        status: "failed",

        attemptNumber: 1,

        providerMessageId: null,

        errorMessage: error.message,

        sentAt: null,
      });

      results.email = {
        success: false,

        recipient,

        error: error.message,
      };
    }
  }

  // Result summary
  const enabledChannels = [
    campaign.whatsappEnabled ? results.whatsapp : null,

    campaign.emailEnabled ? results.email : null,
  ].filter(Boolean);

  const sentCount = enabledChannels.filter((result) => result.success).length;

  const failedCount = enabledChannels.filter(
    (result) => !result.success,
  ).length;

  return {
    campaignId: campaign.id,

    campaignCode: campaign.campaignCode,

    campaignName: campaign.campaignName,

    deliveryMode: campaign.deliveryMode,

    note: "Test mode hanya mengirim satu pesan per channel ke kontak testing.",

    summary: {
      totalChannels: enabledChannels.length,

      sent: sentCount,

      failed: failedCount,
    },

    results,
  };
};

module.exports = {
  simulateCampaignDelivery,
  testCampaignDelivery,
};
