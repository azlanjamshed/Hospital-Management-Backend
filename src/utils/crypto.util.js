const crypto = require("crypto");

/**
 * Generates a cryptographically secure random token (64-character hex string).
 * @returns {string} Raw token string
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Computes the SHA-256 hash of a raw token for secure database storage.
 * @param {string} token - Raw token string
 * @returns {string} SHA-256 hash in hex format
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

module.exports = {
  generateResetToken,
  hashToken,
};
