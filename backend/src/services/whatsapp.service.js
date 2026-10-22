const axios = require("axios");

const sendTestWhatsApp = async ({ message }) => {
  const recipient = process.env.TEST_WHATSAPP_RECIPIENT;

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION;

  const baseUrl =
    process.env.WHATSAPP_API_BASE_URL || "https://graph.facebook.com";

  if (!recipient) {
    throw new Error("TEST_WHATSAPP_RECIPIENT belum dikonfigurasi.");
  }

  if (!accessToken || !phoneNumberId || !graphVersion) {
    throw new Error("Konfigurasi WhatsApp Cloud API belum lengkap.");
  }

  const url = `${baseUrl}/${graphVersion}/${phoneNumberId}/messages`;

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

  return {
    recipient,

    messageId: response.data?.messages?.[0]?.id || null,
  };
};

module.exports = {
  sendTestWhatsApp,
};
