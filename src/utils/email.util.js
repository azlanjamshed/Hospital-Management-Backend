const nodemailer = require("nodemailer");

/**
 * Checks whether SMTP settings are configured in the environment.
 * @returns {boolean}
 */
const isSmtpConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  );
};

/**
 * Sends a password reset email using configured SMTP provider.
 * Throws a 503 error if SMTP is not configured.
 *
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.resetToken - Raw cryptographically secure reset token
 * @param {string} [params.userName] - Recipient user's display name
 * @returns {Promise<Object>}
 */
const sendPasswordResetEmail = async ({ to, resetToken, userName = "User" }) => {
  if (!isSmtpConfigured()) {
    const error = new Error(
      "Email delivery service is not configured (missing SMTP_HOST, SMTP_USER, or SMTP_PASS).",
    );
    error.statusCode = 503;
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }

  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"Doctapp" <${process.env.SMTP_USER}>`,
    to,
    subject: "Reset Your Doctapp Password",
    text: `Hello ${userName},\n\nYou requested a password reset for your Doctapp account. Please use the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes.\nIf you did not request this reset, you can safely ignore this email.\n\nBest regards,\nDoctapp Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a365d;">Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>You recently requested to reset your password for your Doctapp account. Click the button below to reset it:</p>
        <div style="margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #2b6cb0; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #718096; font-size: 14px;">This link will expire in <strong>15 minutes</strong>.</p>
        <p style="color: #718096; font-size: 14px;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #a0aec0; font-size: 12px;">Doctapp Healthcare Platform</p>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

module.exports = {
  isSmtpConfigured,
  sendPasswordResetEmail,
};
