const { askAdvisor } = require("../services/aiAdvisor.service");

const {
  createChatSession,
  getChatSessions,
  getChatSession,
  getChatMessages,
  updateChatSessionTitle,
  deleteChatSession,
} = require("../services/chat.service");

// ASK AI
const ask = async (req, res, next) => {
  try {
    const message = req.body?.message?.trim();

    if (!message) {
      return res.status(400).json({
        success: false,

        message: "Pertanyaan wajib diisi.",
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,

        message: "Pertanyaan maksimal 2000 karakter.",
      });
    }

    let sessionId = req.body?.sessionId || null;

    if (sessionId !== null) {
      sessionId = Number(sessionId);

      if (!Number.isInteger(sessionId) || sessionId <= 0) {
        return res.status(400).json({
          success: false,

          message: "sessionId tidak valid.",
        });
      }
    }

    const data = await askAdvisor({
      userId: req.user.id,

      message,

      sessionId,
    });

    return res.status(200).json({
      success: true,

      message: "AI CRM Advisor berhasil memberikan respons.",

      data,
    });
  } catch (error) {
    next(error);
  }
};

// CREATE SESSION
const createSession = async (req, res, next) => {
  try {
    const title = req.body?.title?.trim() || null;

    if (title && title.length > 200) {
      return res.status(400).json({
        success: false,

        message: "Judul maksimal 200 karakter.",
      });
    }

    const session = await createChatSession({
      userId: req.user.id,

      title,
    });

    return res.status(201).json({
      success: true,

      message: "Chat session berhasil dibuat.",

      data: {
        session,
      },
    });
  } catch (error) {
    next(error);
  }
};

// LIST SESSIONS
const getSessions = async (req, res, next) => {
  try {
    const sessions = await getChatSessions(req.user.id);

    return res.status(200).json({
      success: true,

      data: {
        sessions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// SESSION DETAIL
const getSession = async (req, res, next) => {
  try {
    const session = await getChatSession(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,

      data: {
        session,
      },
    });
  } catch (error) {
    next(error);
  }
};

// SESSION MESSAGES
const getMessages = async (req, res, next) => {
  try {
    const data = await getChatMessages({
      sessionId: req.params.id,

      userId: req.user.id,

      page: req.query.page,

      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,

      data,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE SESSION
const updateSession = async (req, res, next) => {
  try {
    const title = req.body?.title?.trim();

    if (!title) {
      return res.status(400).json({
        success: false,

        message: "Judul wajib diisi.",
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,

        message: "Judul maksimal 200 karakter.",
      });
    }

    const session = await updateChatSessionTitle({
      sessionId: req.params.id,

      userId: req.user.id,

      title,
    });

    return res.status(200).json({
      success: true,

      message: "Judul chat berhasil diperbarui.",

      data: {
        session,
      },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE SESSION
const deleteSession = async (req, res, next) => {
  try {
    await deleteChatSession(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,

      message: "Chat session berhasil dihapus.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  ask,
  createSession,
  getSessions,
  getSession,
  getMessages,
  updateSession,
  deleteSession,
};
