const express = require("express");
const router = express.Router();
const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const {
  checkInAppointment,
  callAppointment,
  startConsultation,
} = require("./queue.controller");

router.patch(
  "/:organizationId/appointments/:appointmentId/check-in",
  authentication,
  requireOrganizationRole("ADMIN", "MANAGER", "RECEPTIONIST", "NURSE"),
  checkInAppointment,
);
router.patch(
  "/:organizationId/appointments/:appointmentId/call",
  authentication,
  requireOrganizationRole("ADMIN", "MANAGER", "NURSE", "DOCTOR"),
  callAppointment,
);
router.patch(
  "/:organizationId/appointments/:appointmentId/start-consultation",
  authentication,
  requireOrganizationRole("ADMIN", "MANAGER", "NURSE", "DOCTOR"),
  startConsultation,
);

module.exports = router;
