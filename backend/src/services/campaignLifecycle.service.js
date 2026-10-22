const {
  Campaign,
  CampaignTarget,
  Segment,
  PromotionStrategy,
} = require("../models");

const { createNotificationForAllUsers } = require("./notification.service");

// Helper: Get campaign
const getCampaign = async (campaignId) => {
  const campaign = await Campaign.findByPk(campaignId, {
    include: [
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
    ],
  });

  if (!campaign) {
    const error = new Error("Campaign tidak ditemukan.");
    error.status = 404;
    throw error;
  }

  return campaign;
};

// SCHEDULE CAMPAIGN
// draft ke scheduled
const scheduleCampaign = async (campaignId) => {
  const campaign = await getCampaign(campaignId);

  if (campaign.status !== "draft") {
    const error = new Error(
      "Hanya campaign berstatus draft yang dapat dijadwalkan.",
    );
    error.status = 400;
    throw error;
  }

  const targetCount = await CampaignTarget.count({
    where: {
      campaignId: campaign.id,
    },
  });

  if (targetCount === 0) {
    const error = new Error(
      "Target campaign belum dibuat. Generate target terlebih dahulu.",
    );
    error.status = 400;
    throw error;
  }

  if (!campaign.whatsappEnabled && !campaign.emailEnabled) {
    const error = new Error("Minimal satu channel campaign harus diaktifkan.");
    error.status = 400;
    throw error;
  }

  const start = new Date(campaign.startDatetime);
  const end = new Date(campaign.endDatetime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const error = new Error("Tanggal campaign tidak valid.");
    error.status = 400;
    throw error;
  }

  if (start >= end) {
    const error = new Error("Waktu mulai harus lebih awal dari waktu selesai.");
    error.status = 400;
    throw error;
  }

  campaign.status = "scheduled";

  await campaign.save();

  return {
    campaignId: campaign.id,
    campaignCode: campaign.campaignCode,
    campaignName: campaign.campaignName,
    previousStatus: "draft",
    status: campaign.status,
    targetCount,
    startDatetime: campaign.startDatetime,
    endDatetime: campaign.endDatetime,
  };
};

// START CAMPAIGN
// scheduled ke active
const startCampaign = async (campaignId) => {
  const campaign = await getCampaign(campaignId);

  if (campaign.status !== "scheduled") {
    const error = new Error(
      "Hanya campaign berstatus scheduled yang dapat dimulai.",
    );
    error.status = 400;
    throw error;
  }

  const targetCount = await CampaignTarget.count({
    where: {
      campaignId: campaign.id,
    },
  });

  if (targetCount === 0) {
    const error = new Error("Campaign tidak memiliki target.");
    error.status = 400;
    throw error;
  }

  campaign.status = "active";

  await campaign.save();

  await createNotificationForAllUsers({
    notificationType: "campaign_started",

    title: "Campaign Dimulai",

    message: `Campaign "${campaign.campaignName}" telah dimulai.`,

    referenceType: "campaign",

    referenceId: campaign.id,
  });

  return {
    campaignId: campaign.id,
    campaignCode: campaign.campaignCode,
    campaignName: campaign.campaignName,
    previousStatus: "scheduled",
    status: campaign.status,
    targetCount,
  };
};

// COMPLETE CAMPAIGN
// active ke completed
const completeCampaign = async (campaignId) => {
  const campaign = await getCampaign(campaignId);

  if (campaign.status !== "active") {
    const error = new Error(
      "Hanya campaign berstatus active yang dapat diselesaikan.",
    );
    error.status = 400;
    throw error;
  }

  campaign.status = "completed";

  await campaign.save();

  await createNotificationForAllUsers({
    notificationType: "campaign_completed",

    title: "Campaign Selesai",

    message: `Campaign "${campaign.campaignName}" telah selesai.`,

    referenceType: "campaign",

    referenceId: campaign.id,
  });

  return {
    campaignId: campaign.id,
    campaignCode: campaign.campaignCode,
    campaignName: campaign.campaignName,
    previousStatus: "active",
    status: campaign.status,
  };
};

// CANCEL CAMPAIGN
// draft/scheduled/active ke cancelled
const cancelCampaign = async (campaignId) => {
  const campaign = await getCampaign(campaignId);

  const cancellableStatuses = ["draft", "scheduled", "active"];

  if (!cancellableStatuses.includes(campaign.status)) {
    const error = new Error(
      `Campaign berstatus ${campaign.status} tidak dapat dibatalkan.`,
    );
    error.status = 400;
    throw error;
  }

  const previousStatus = campaign.status;

  campaign.status = "cancelled";

  await campaign.save();

  return {
    campaignId: campaign.id,
    campaignCode: campaign.campaignCode,
    campaignName: campaign.campaignName,
    previousStatus,
    status: campaign.status,
  };
};

module.exports = {
  scheduleCampaign,
  startCampaign,
  completeCampaign,
  cancelCampaign,
};
