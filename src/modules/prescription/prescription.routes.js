const express = require("express");

const router = express.Router();

const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const validate = require("../../middleware/validate");

const {
  createPrescription,
  getPrescription,
  getPatientPrescription,
  getPrescriptionPrintData,
  generatePrescriptionPdf,
  generatePatientPrescriptionPdf,
} = require("./prescription.controller");

const { createPrescriptionSchema } = require("./prescription.validation");
const patientOrOrganizationRole = require("../../middleware/patientOrOrganizationRole");

router.post(
  "/:organizationId/:consultationId",
  authentication,
  requireOrganizationRole("DOCTOR"),
  validate(createPrescriptionSchema),
  createPrescription,
);

router.get(
  "/patient/:prescriptionId",
  authentication,
  patientOrOrganizationRole(),
  getPatientPrescription,
);

router.get(
  "/:organizationId/:prescriptionId",
  authentication,
  requireOrganizationRole("ADMIN", "NURSE", "DOCTOR"),
  getPrescription,
);

router.get(
  "/:organizationId/:prescriptionId/print-data",
  authentication,
  requireOrganizationRole("ADMIN", "NURSE", "DOCTOR"),
  getPrescriptionPrintData,
);
router.get(
  "/patient/:organizationId/:patientId/:prescriptionId/pdf",
  authentication,
  patientOrOrganizationRole(),
  generatePatientPrescriptionPdf,
);
router.get(
  "/:organizationId/:prescriptionId/pdf",
  authentication,
  requireOrganizationRole("ADMIN", "NURSE", "DOCTOR"),
  generatePrescriptionPdf,
);

module.exports = router;
