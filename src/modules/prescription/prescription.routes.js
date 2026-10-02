const express = require("express");

const router = express.Router();

const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const validate = require("../../middleware/validate");

const {
  createPrescription,
  getPrescription,
  getPatientPrescription,
} = require("./prescription.controller");

const { createPrescriptionSchema } = require("./prescription.validation");

router.post(
  "/:organizationId/:consultationId",
  authentication,
  requireOrganizationRole("DOCTOR"),
  validate(createPrescriptionSchema),
  createPrescription,
);
router.get(
  "/:organizationId/:prescriptionId",
  authentication,
  requireOrganizationRole("ADMIN", "NURSE", "DOCTOR"),
  getPrescription,
);
router.get(
  "/patient/:prescriptionId",
  authentication,
  requireOrganizationRole("PATIENT"),
  getPatientPrescription,
);

module.exports = router;
