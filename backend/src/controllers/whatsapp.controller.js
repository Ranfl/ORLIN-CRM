// src/controllers/whatsapp.controller.js

// ==========================================
// VERIFY WEBHOOK
// ==========================================

const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];

  const token = req.query["hub.verify_token"];

  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error(
      "[WhatsApp Webhook] WHATSAPP_VERIFY_TOKEN belum dikonfigurasi.",
    );

    return res.status(500).send("WHATSAPP_VERIFY_TOKEN belum dikonfigurasi.");
  }

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp Webhook] Verification success.");

    return res.status(200).send(challenge);
  }

  console.warn("[WhatsApp Webhook] Verification failed.", {
    mode,
    tokenMatch: token === verifyToken,
  });

  return res.sendStatus(403);
};

// ==========================================
// RECEIVE WEBHOOK
// ==========================================

const receiveWebhook = async (req, res) => {
  try {
    const body = req.body;

    console.log(
      "[WhatsApp Webhook] Incoming event:",
      JSON.stringify(body, null, 2),
    );

    if (body.object !== "whatsapp_business_account") {
      return res.sendStatus(200);
    }

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value || {};

        // ==================================
        // INCOMING MESSAGE
        // ==================================

        const messages = value.messages || [];

        for (const message of messages) {
          console.log("[WhatsApp Webhook] Incoming message:", {
            messageId: message.id,

            from: message.from,

            timestamp: message.timestamp,

            type: message.type,

            text: message.text?.body || null,
          });
        }

        // ==================================
        // DELIVERY STATUS
        // ==================================

        const statuses = value.statuses || [];

        for (const status of statuses) {
          console.log("[WhatsApp Webhook] Message status:", {
            messageId: status.id,

            status: status.status,

            recipientId: status.recipient_id,

            timestamp: status.timestamp,

            errors: status.errors || null,
          });
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("[WhatsApp Webhook] Processing error:", error);

    // Untuk tahap testing kita tetap acknowledge
    // agar Meta tidak retry terus-menerus.
    return res.sendStatus(200);
  }
};

module.exports = {
  verifyWebhook,
  receiveWebhook,
};
