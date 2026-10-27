const nodemailer = require("nodemailer");

// ==========================================
// CREATE TRANSPORTER
// ==========================================

const createTransporter = () => {
  const host = process.env.SMTP_HOST;

  const port = Number(process.env.SMTP_PORT || 587);

  const secure =
    String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  const user = process.env.SMTP_USER;

  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    const error = new Error("Konfigurasi SMTP email belum lengkap.");

    error.status = 503;

    throw error;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,

    auth: {
      user,
      pass,
    },
  });
};

// ==========================================
// VERIFY SMTP CONNECTION
// ==========================================

const verifyEmailConnection = async () => {
  const transporter = createTransporter();

  try {
    console.log("[Email] Verifying SMTP connection:", {
      provider: process.env.EMAIL_PROVIDER || "smtp",

      host: process.env.SMTP_HOST,

      port: process.env.SMTP_PORT,

      secure: process.env.SMTP_SECURE,

      smtpUser: process.env.SMTP_USER,
    });

    await transporter.verify();

    console.log("[Email] SMTP verification success.");

    return {
      success: true,

      provider: process.env.EMAIL_PROVIDER || "smtp",

      host: process.env.SMTP_HOST,

      port: Number(process.env.SMTP_PORT || 587),

      secure:
        String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",

      smtpUser: process.env.SMTP_USER,
    };
  } catch (error) {
    console.error("[Email] SMTP verification failed:", error.message);

    const smtpError = new Error(`Koneksi SMTP gagal: ${error.message}`);

    smtpError.status = 502;

    throw smtpError;
  }
};

// ==========================================
// SEND TEST EMAIL
// ==========================================

const sendTestEmail = async ({ subject, body }) => {
  const transporter = createTransporter();

  const recipient = process.env.EMAIL_TEST_RECIPIENT;

  const fromName = process.env.EMAIL_FROM_NAME || "ORLIN Salon";

  const fromAddress = process.env.EMAIL_FROM_ADDRESS;

  // ======================================
  // VALIDATION
  // ======================================

  if (!recipient) {
    const error = new Error("EMAIL_TEST_RECIPIENT belum dikonfigurasi.");

    error.status = 503;

    throw error;
  }

  if (!fromAddress) {
    const error = new Error("EMAIL_FROM_ADDRESS belum dikonfigurasi.");

    error.status = 503;

    throw error;
  }

  if (!subject) {
    const error = new Error("Subject email tidak boleh kosong.");

    error.status = 400;

    throw error;
  }

  if (!body) {
    const error = new Error("Body email tidak boleh kosong.");

    error.status = 400;

    throw error;
  }

  try {
    // ====================================
    // DEBUG BEFORE SEND
    // ====================================

    console.log("[Email] Preparing email:", {
      provider: process.env.EMAIL_PROVIDER || "smtp",

      host: process.env.SMTP_HOST,

      smtpUser: process.env.SMTP_USER,

      from: `${fromName} <${fromAddress}>`,

      to: recipient,

      subject,
    });

    // ====================================
    // SEND
    // ====================================

    const result = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,

      to: recipient,

      subject,

      text: body,

      html: `
            <div
              style="
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #222;
              "
            >
              <p>
                ${String(body).replace(/\n/g, "<br>")}
              </p>

              <hr>

              <small>
                Pesan ini dikirim melalui ORLIN CRM.
              </small>
            </div>
          `,
    });

    // ====================================
    // DEBUG SMTP RESULT
    // ====================================

    console.log("[Email] SMTP result:", {
      messageId: result.messageId,

      accepted: result.accepted,

      rejected: result.rejected,

      response: result.response,

      envelope: result.envelope,
    });

    // ====================================
    // RETURN RESULT
    // ====================================

    return {
      success: true,

      channel: "email",

      provider: process.env.EMAIL_PROVIDER || "smtp",

      recipient,

      providerMessageId: result.messageId || null,

      accepted: result.accepted || [],

      rejected: result.rejected || [],

      smtpResponse: result.response || null,

      envelope: result.envelope || null,
    };
  } catch (error) {
    console.error("[Email] Send failed:", {
      message: error.message,

      code: error.code,

      command: error.command,

      response: error.response,

      responseCode: error.responseCode,
    });

    const sendError = new Error(`Email gagal dikirim: ${error.message}`);

    sendError.status = 502;

    throw sendError;
  }
};

module.exports = {
  verifyEmailConnection,
  sendTestEmail,
};
