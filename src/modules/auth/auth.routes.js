const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("./auth.controller");
const validate = require("../../middleware/validate");
const authentication = require("../../middleware/auth");
const { registerSchema, loginSchema } = require("./auth.validation");
const requireRole = require("../../middleware/roles");

router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.get("/me", authentication, getMe);
router.get(
  "/super-admin-test",
  authentication,
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
