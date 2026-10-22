const GroqModule = require("groq-sdk");

const Groq = GroqModule.default || GroqModule;

// GET GROQ CLIENT
const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    const error = new Error("GROQ_API_KEY belum dikonfigurasi.");

    error.status = 503;

    throw error;
  }

  return new Groq({
    apiKey,

    timeout: 30 * 1000,

    maxRetries: 2,
  });
};

// CHAT COMPLETION
const createChatCompletion = async ({ systemPrompt, userPrompt }) => {
  const client = getGroqClient();

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  const temperature = Number(process.env.GROQ_TEMPERATURE || 0.4);

  const maxCompletionTokens = Number(
    process.env.GROQ_MAX_COMPLETION_TOKENS || 1200,
  );

  try {
    const completion = await client.chat.completions.create({
      model,

      messages: [
        {
          role: "system",

          content: systemPrompt,
        },

        {
          role: "user",

          content: userPrompt,
        },
      ],

      temperature,

      max_completion_tokens: maxCompletionTokens,

      stream: false,
    });

    const answer = completion?.choices?.[0]?.message?.content;

    if (!answer) {
      const error = new Error("AI Advisor tidak menghasilkan respons.");

      error.status = 502;

      throw error;
    }

    return {
      answer,

      model: completion.model || model,

      usage: {
        promptTokens: completion?.usage?.prompt_tokens || 0,

        completionTokens: completion?.usage?.completion_tokens || 0,

        totalTokens: completion?.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error("Groq API Error:", error);

    if (error.status === 401) {
      const authError = new Error("GROQ_API_KEY tidak valid.");

      authError.status = 502;

      throw authError;
    }

    if (error.status === 429) {
      const rateError = new Error(
        "Batas penggunaan AI sedang tercapai. Silakan coba kembali.",
      );

      rateError.status = 429;

      throw rateError;
    }

    if (error.status && error.status >= 400 && error.status < 500) {
      const providerError = new Error(
        `Groq API menolak request: ${error.message}`,
      );

      providerError.status = 502;

      throw providerError;
    }

    if (error.status && error.status >= 500) {
      const providerError = new Error("Layanan AI sedang mengalami gangguan.");

      providerError.status = 503;

      throw providerError;
    }

    throw error;
  }
};

module.exports = {
  createChatCompletion,
};
