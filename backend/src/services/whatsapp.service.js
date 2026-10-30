const axios = require("axios");

// ==========================================
// SEND TEST WHATSAPP
// ==========================================

const sendTestWhatsApp = async ({ message }) => {
  const recipient = process.env.WHATSAPP_TEST_RECIPIENT;

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION;

  const baseUrl =
    process.env.WHATSAPP_API_BASE_URL || "https://graph.facebook.com";

  // ======================================
  // VALIDATION
  // ======================================

  if (!recipient) {
    const error = new Error("WHATSAPP_TEST_RECIPIENT belum dikonfigurasi.");

    error.status = 503;

    throw error;
  }

  if (!accessToken) {
    const error = new Error("WHATSAPP_ACCESS_TOKEN belum dikonfigurasi.");

    error.status = 503;

    throw error;
  }

  if (!phoneNumberId) {
    const error = new Error("WHATSAPP_PHONE_NUMBER_ID belum dikonfigurasi.");

    error.status = 503;

    throw error;
  }

  if (!graphVersion) {
    const error = new Error("WHATSAPP_GRAPH_VERSION belum dikonfigurasi.");

    error.status = 503;

    throw error;
  }

  if (!message) {
    const error = new Error("Pesan WhatsApp tidak boleh kosong.");

    error.status = 400;

    throw error;
  }

  const url = `${baseUrl}/${graphVersion}/${phoneNumberId}/messages`;

  try {
    console.log("[WhatsApp] Sending message:", {
      provider: "meta",

      phoneNumberId,

      recipient,

      graphVersion,
    });

    const response = await axios.post(
      url,

      {
        messaging_product: "whatsapp",

        recipient_type: "individual",

        to: recipient,

        type: "text",

        text: {
          preview_url: false,

          body: message,
        },
      },

      {
        headers: {
          Authorization: `Bearer ${accessToken}`,

          "Content-Type": "application/json",
        },

        timeout: 30000,
      },
    );

    const messageId = response.data?.messages?.[0]?.id || null;

    console.log("[WhatsApp] Meta response:", {
      recipient,
      messageId,
    });

    return {
      success: true,

      provider: "meta",

      channel: "whatsapp",

      recipient,

      messageId,

      providerMessageId: messageId,
    };
  } catch (error) {
    console.error("[WhatsApp] Send failed:", {
      status: error.response?.status,

      data: error.response?.data,

      message: error.message,
    });

    const metaMessage = error.response?.data?.error?.message || error.message;

    const sendError = new Error(`WhatsApp gagal dikirim: ${metaMessage}`);

    sendError.status = error.response?.status || 502;

    throw sendError;
  }
};

module.exports = {
  sendTestWhatsApp,
};
