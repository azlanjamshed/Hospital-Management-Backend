const express = require("express");

const router = express.Router();

const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const validate = require("../../middleware/validate");

const {
  updateConsultation,
  completeConsultation,
  getConsultation,
} = require("./consultation.controller");
const { updateConsultationSchema } = require("./consultation.validation");

router.patch(
  "/:organizationId/:consultationId/complete",
  authentication,
  requireOrganizationRole("DOCTOR"),
  completeConsultation,
);

router.patch(
  "/:organizationId/:consultationId",
  authentication,
  requireOrganizationRole("DOCTOR"),
  validate(updateConsultationSchema),
  updateConsultation,
);
router.get(
  "/:organizationId/:consultationId",
  authentication,
  requireOrganizationRole("ADMIN", "MANAGER", "NURSE", "DOCTOR"),
  getConsultation,
);
module.exports = router;
