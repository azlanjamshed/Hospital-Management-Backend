const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("./auth.controller");
const validate = require("../../middleware/validate");
const authentication = require("../../middleware/auth");
const { registerSchema, loginSchema } = require("./auth.validation");

router.post("/register", validate(registerSchema), register);

router.post("/login", validate(loginSchema), login);

router.get("/me", authentication, getMe);

module.exports = router;
