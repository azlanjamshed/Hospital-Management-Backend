const express = require("express");
const router = express.Router();
const validation = require("../../middleware/validate");
const authentication = require("../../middleware/auth");
const role = require("../../middleware/roles");
const { createOrganization } = require("./organization.controller");
const { createOrganizationSchema } = require("./organization.validation");

router.post(
  "/",
  authentication,
  role("SUPER_ADMIN"),
  validation(createOrganizationSchema),
  createOrganization,
);

module.exports = router;
