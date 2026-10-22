const { QueryTypes } = require("sequelize");

const sequelize = require("../config/database");

const { ChatSession, ChatMessage } = require("../models");

// SESSION VALIDATION
const getSessionOrFail = async (sessionId, userId) => {
  const session = await ChatSession.findOne({
    where: {
      id: sessionId,

      userId,
    },
  });

  if (!session) {
    const error = new Error("Chat session tidak ditemukan.");

    error.status = 404;

    throw error;
  }

  return session;
};

// CREATE SESSION
const createChatSession = async ({ userId, title = null }) => {
  return ChatSession.create({
    userId,

    title: title?.trim() || null,
  });
};

// LIST SESSIONS
const getChatSessions = async (userId) => {
  const rows = await sequelize.query(
    `
        SELECT

          cs.id,

          cs.title,

          cs.created_at
            AS createdAt,

          cs.updated_at
            AS updatedAt,

          (
            SELECT
              cm.message

            FROM chat_messages cm

            WHERE
              cm.chat_session_id
              =
              cs.id

            ORDER BY
              cm.created_at DESC,
              cm.id DESC

            LIMIT 1
          ) AS lastMessage,

          (
            SELECT
              COUNT(*)

            FROM chat_messages cm

            WHERE
              cm.chat_session_id
              =
              cs.id

          ) AS totalMessages

        FROM chat_sessions cs

        WHERE
          cs.user_id
          =
          :userId

        ORDER BY
          cs.updated_at DESC,
          cs.id DESC
        `,
    {
      replacements: {
        userId,
      },

      type: QueryTypes.SELECT,
    },
  );

  return rows.map((row) => ({
    id: Number(row.id),

    title: row.title,

    lastMessage: row.lastMessage,

    totalMessages: Number(row.totalMessages),

    createdAt: row.createdAt,

    updatedAt: row.updatedAt,
  }));
};

// GET SESSION DETAIL
const getChatSession = async (sessionId, userId) => {
  const session = await getSessionOrFail(sessionId, userId);

  return session;
};

// GET MESSAGES
const getChatMessages = async ({ sessionId, userId, page = 1, limit = 50 }) => {
  await getSessionOrFail(sessionId, userId);

  const safePage = Math.max(Number(page) || 1, 1);

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  const offset = (safePage - 1) * safeLimit;

  const { count, rows } = await ChatMessage.findAndCountAll({
    where: {
      chatSessionId: sessionId,
    },

    order: [
      ["createdAt", "ASC"],

      ["id", "ASC"],
    ],

    limit: safeLimit,

    offset,
  });

  return {
    messages: rows,

    pagination: {
      page: safePage,

      limit: safeLimit,

      totalData: count,

      totalPages: Math.ceil(count / safeLimit),
    },
  };
};

// GET AI HISTORY
const getChatHistoryForAI = async ({ sessionId, userId, limit = 12 }) => {
  await getSessionOrFail(sessionId, userId);

  const messages = await ChatMessage.findAll({
    where: {
      chatSessionId: sessionId,
    },

    order: [
      ["createdAt", "DESC"],

      ["id", "DESC"],
    ],

    limit,
  });
  return messages.reverse();
};

// GENERATE TITLE
const generateSessionTitle = (message) => {
  const clean = message.replace(/\s+/g, " ").trim();

  if (clean.length <= 80) {
    return clean;
  }

  return clean.slice(0, 77) + "...";
};

// SAVE CONVERSATION TURN
const saveConversationTurn = async ({
  session,
  userMessage,
  assistantMessage,
}) => {
  const dbTransaction = await sequelize.transaction();

  try {
    await ChatMessage.bulkCreate(
      [
        {
          chatSessionId: session.id,

          role: "user",

          message: userMessage,
        },

        {
          chatSessionId: session.id,

          role: "assistant",

          message: assistantMessage,
        },
      ],
      {
        transaction: dbTransaction,
      },
    );

    const updateData = {
      updatedAt: new Date(),
    };

    // Title otomatis dari pertanyaan pertama
    if (!session.title) {
      updateData.title = generateSessionTitle(userMessage);
    }

    await session.update(updateData, {
      transaction: dbTransaction,
    });

    await dbTransaction.commit();

    return session;
  } catch (error) {
    if (!dbTransaction.finished) {
      await dbTransaction.rollback();
    }

    throw error;
  }
};

// UPDATE TITLE
const updateChatSessionTitle = async ({ sessionId, userId, title }) => {
  const session = await getSessionOrFail(sessionId, userId);

  await session.update({
    title: title.trim(),

    updatedAt: new Date(),
  });

  return session;
};

// DELETE SESSION
const deleteChatSession = async (sessionId, userId) => {
  const session = await getSessionOrFail(sessionId, userId);

  const dbTransaction = await sequelize.transaction();

  try {
    await ChatMessage.destroy({
      where: {
        chatSessionId: session.id,
      },

      transaction: dbTransaction,
    });

    await session.destroy({
      transaction: dbTransaction,
    });

    await dbTransaction.commit();

    return true;
  } catch (error) {
    if (!dbTransaction.finished) {
      await dbTransaction.rollback();
    }

    throw error;
  }
};

module.exports = {
  getSessionOrFail,
  createChatSession,
  getChatSessions,
  getChatSession,
  getChatMessages,
  getChatHistoryForAI,
  saveConversationTurn,
  updateChatSessionTitle,
  deleteChatSession,
};
