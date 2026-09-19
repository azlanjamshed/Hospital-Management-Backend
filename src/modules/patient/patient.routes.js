const express = require("express");
const validate = require("../../middleware/validate");
const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const {
  createPatient,
  searchPatients,
  linkPatientToOrganization,
  getPatientById,
} = require("./patient.controller");
const {
  createPatientSchema,
  updatePatientSchema,
  searchPatientSchema,
} = require("./patient.validation");
const router = express.Router();

router.get(
  "/:organizationId/patients/search",
  authentication,
  requireOrganizationRole("ADMIN", "NURSE"),
  validate(searchPatientSchema, "query"),
  searchPatients,
);
router.post(
  "/:organizationId/patients",
  authentication,
  requireOrganizationRole("ADMIN", "NURSE"),
  validate(createPatientSchema),
  createPatient,
);

router.post(
  "/:organizationId/patients/:patientId/link",
  authentication,
  requireOrganizationRole("ADMIN", "NURSE"),
  linkPatientToOrganization,
);

router.get(
  "/:organizationId/patients/:patientId",
  authentication,
  requireOrganizationRole("ADMIN", "NURSE"),
  getPatientById,
);
module.exports = router;
