const express = require("express");
const { createDoctor } = require("./organization-staff.controller");
const { createDoctorSchema } = require("./organization-staff.validation");
const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const validate = require("../../middleware/validate");
const router = express.Router();

router.post(
  "/:organizationId/doctors",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(createDoctorSchema),
  createDoctor,
);

module.exports = router;
