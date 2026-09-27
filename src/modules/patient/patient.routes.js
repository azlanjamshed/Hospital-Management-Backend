const express = require("express");
const validate = require("../../middleware/validate");
const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const patientOrOrganizationRole = require("../../middleware/patientOrOrganizationRole");

const {
  createPatient,
  searchPatients,
  linkPatientToOrganization,
  getPatientById,
  getPatientAppointments,
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

router.get(
  "/:organizationId/patients/:patientId/appointments",
  authentication,
  patientOrOrganizationRole("ADMIN", "MANAGER", "RECEPTIONIST", "NURSE"),

  getPatientAppointments,
);
module.exports = router;
