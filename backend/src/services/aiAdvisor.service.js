const { buildAdvisorContext } = require("./advisorContext.service");

const { createChatCompletion } = require("./groq.service");

const {
  createChatSession,
  getSessionOrFail,
  getChatHistoryForAI,
  saveConversationTurn,
} = require("./chat.service");

// SYSTEM PROMPT
const SYSTEM_PROMPT = `
Anda adalah ORLINA AI CRM & Promotion Advisor untuk ORLIN Salon Banjarnegara.

PERAN:
Anda membantu owner dan staff memahami data CRM, hasil RFM, hasil K-Means clustering, transaksi, layanan, campaign, serta memberikan rekomendasi strategi CRM dan promosi.

BATASAN PENTING:
1. Anda hanya bertindak sebagai advisor, bukan pengambil keputusan.
2. Jangan mengatakan bahwa AI otomatis menetapkan keputusan promosi.
3. K-Means hanya mengelompokkan customer berdasarkan Recency, Frequency, dan Monetary.
4. K-Means tidak menentukan diskon, cashback, tanggal campaign, atau channel.
5. Besaran promosi dan keputusan campaign tetap diputuskan administrator.
6. Gunakan data CRM context sebagai sumber fakta bisnis.
7. Jangan membuat angka, customer, transaksi, atau campaign yang tidak tersedia.
8. Jika data tidak tersedia, katakan bahwa data belum tersedia.
9. Bedakan hasil clustering dengan business rule.
10. Segmentasi bisnis ORLIN:
   - VVIP Customer → Retention → Exclusive Loyalty Promotion
   - Loyal Customer → Retention → Loyalty Promotion
   - At Risk Customer → Reactivation → Comeback Promotion
   - Inactive Customer → Win-back/Re-engagement → Win-back Promotion
11. Gunakan bahasa Indonesia yang profesional dan mudah dipahami.
12. Berikan alasan berbasis data.
13. Jangan menyebut hasil clustering sebagai "akurasi".
14. Conversation history hanya digunakan untuk memahami konteks percakapan.
15. Fakta bisnis dan angka harus tetap berasal dari CRM CONTEXT terbaru.

FORMAT:
Jawab secara langsung, ringkas, jelas, dan actionable.
`;

// BUILD HISTORY TEXT
const buildHistoryText = (messages) => {
  if (!messages || messages.length === 0) {
    return "Belum ada percakapan sebelumnya.";
  }

  return messages
    .map((item) => {
      const role =
        item.role === "assistant"
          ? "AI"
          : item.role === "system"
            ? "SYSTEM"
            : "USER";

      return `${role}: ${item.message}`;
    })
    .join("\n\n");
};

// ASK ADVISOR
const askAdvisor = async ({ userId, message, sessionId = null }) => {
  let session;
  let createdNewSession = false;

  // Resolve session
  if (sessionId) {
    session = await getSessionOrFail(sessionId, userId);
  } else {
    session = await createChatSession({
      userId,
    });

    createdNewSession = true;
  }

  try {
    // CRM context terbaru
    const context = await buildAdvisorContext({
      userId,
    });

    // History chat
    const history = await getChatHistoryForAI({
      sessionId: session.id,

      userId,

      limit: Number(process.env.AI_HISTORY_LIMIT || 12),
    });

    const historyText = buildHistoryText(history);

    // Prompt
    const userPrompt = `
=== CRM CONTEXT TERBARU ===
${JSON.stringify(context, null, 2)}

=== CONVERSATION HISTORY ===
${historyText}

=== PERTANYAAN USER SAAT INI ===
${message}

Gunakan conversation history untuk memahami konteks pertanyaan lanjutan.

Untuk fakta, angka, segmentasi, transaksi, campaign, dan kondisi bisnis, tetap gunakan CRM CONTEXT TERBARU sebagai sumber utama.
`;

    // Groq
    const result = await createChatCompletion({
      systemPrompt: SYSTEM_PROMPT,

      userPrompt,
    });

    // Save conversation
    await saveConversationTurn({
      session,

      userMessage: message,

      assistantMessage: result.answer,
    });

    return {
      session: {
        id: Number(session.id),

        title: session.title,
      },

      answer: result.answer,

      model: result.model,

      usage: result.usage,

      context: {
        referenceDate: context.referenceDate,

        analysisRunId: context?.latestAnalysis?.id || null,
      },

      generatedAt: new Date(),
    };
  } catch (error) {
    // Kalau session baru dibuat tetapi Groq gagal sebelum ada conversation, hapus session kosong.
    if (createdNewSession) {
      try {
        await session.destroy();
      } catch (cleanupError) {
        console.error("Failed cleaning empty chat session:", cleanupError);
      }
    }

    throw error;
  }
};

module.exports = {
  askAdvisor,
};
