const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,

  port: Number(process.env.SMTP_PORT || 587),

  secure: process.env.SMTP_SECURE === "true",

  auth: {
    user: process.env.SMTP_USER,

    pass: process.env.SMTP_PASSWORD,
  },
});

const verifyEmailConnection = async () => {
  await transporter.verify();

  return true;
};

const sendTestEmail = async ({ subject, body }) => {
  const recipient = process.env.TEST_EMAIL_RECIPIENT;

  if (!recipient) {
    throw new Error("TEST_EMAIL_RECIPIENT belum dikonfigurasi.");
  }

  const result = await transporter.sendMail({
    from: {
      name: process.env.SMTP_FROM_NAME || "ORLIN Salon",

      address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    },

    to: recipient,

    subject: subject,

    text: body,
  });

  return {
    recipient,

    messageId: result.messageId,
  };
};

module.exports = {
  verifyEmailConnection,
  sendTestEmail,
};
