const nodemailer = require("nodemailer");

function createTransporter() {
  if (!process.env.SMTP_HOST) {
    console.warn("SMTP_HOST not configured. Email alerts will be disabled.");
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      : undefined
  });
}

const transporter = createTransporter();

async function sendEmail({ to, subject, html, text, attachments }) {
  if (!transporter) {
    console.warn("Email not sent because transporter is not configured.");
    return;
  }

  const mailOptions = {
    from: process.env.MAIL_FROM || "no-reply@bizease.ae",
    to,
    subject,
    text,
    html,
    attachments: attachments || []
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendEmail
};

