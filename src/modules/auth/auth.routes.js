const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} = require("./auth.controller");

const validate = require("../../middleware/validate");
const authenticate = require("../../middleware/auth");
const requireRole = require("../../middleware/roles");

const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("./auth.validation");

// 1. Patient Registration
router.post("/register", validate(registerSchema), register);

// 2. Multi-Identifier Login (email or phone)
router.post("/login", validate(loginSchema), login);

// 3. Authenticated User Profile
router.get("/me", authenticate, getMe);

// 4. Update Profile Fields
router.patch("/me", authenticate, validate(updateProfileSchema), updateProfile);

// 5. Change Password (requires current password & revokes existing sessions)
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  changePassword,
);

// 6. Request Password Reset (safe, non-enumerating)
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

// 7. Reset Password (single-use, revokes existing sessions)
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// 8. Super Admin Access Verification (preserved behavior)
router.get(
  "/super-admin-test",
  authenticate,
  requireRole("SUPER_ADMIN"),
  (req, res) => {
    res.json({
      success: true,
      message: "Super Admin access granted",
      user: req.user,
    });
  },
);

module.exports = router;
