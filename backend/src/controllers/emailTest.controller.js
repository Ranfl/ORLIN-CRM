const {
  verifyEmailConnection,
  sendTestEmail,
} = require("../services/email.service");

// ==========================================
// VERIFY SMTP
// ==========================================

const verifySMTP = async (req, res, next) => {
  try {
    const data = await verifyEmailConnection();

    return res.status(200).json({
      success: true,
      message: "Koneksi SMTP berhasil.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SEND TEST EMAIL
// ==========================================

const sendEmailTest = async (req, res, next) => {
  try {
    const data = await sendTestEmail({
      subject: "Test Email ORLIN CRM",

      body: "Halo, ini adalah pengujian pengiriman email dari sistem ORLIN CRM.",
    });

    return res.status(200).json({
      success: true,
      message: "Email test berhasil dikirim.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifySMTP,
  sendEmailTest,
};
