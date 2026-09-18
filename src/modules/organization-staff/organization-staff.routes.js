const express = require("express");
const {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  updateDoctorStatus,
} = require("./organization-staff.controller");
const {
  createDoctorSchema,
  updateDoctorSchema,
  updateDoctorStatusSchema,
} = require("./organization-staff.validation");
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
router.get(
  "/:organizationId/doctors",
  authentication,
  requireOrganizationRole("ADMIN"),
  getDoctors,
);
router.get(
  "/:organizationId/:doctorId",
  authentication,
  requireOrganizationRole("ADMIN"),
  getDoctorById,
);
router.patch(
  "/:organizationId/doctors/:doctorId",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(updateDoctorSchema),
  updateDoctor,
);

router.patch(
  "/:organizationId/doctors/:doctorId/status",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(updateDoctorStatusSchema),
  updateDoctorStatus,
);
module.exports = router;
