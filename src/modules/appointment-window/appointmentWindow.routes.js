const express = require("express");
const router = express.Router();
const validate = require("../../middleware/validate");
const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const {
  createOrUpdateAppointmentWindow,
  getDoctorAppointmentWindows,
} = require("./appointmentWindow.controller");
const {
  createAppointmentWindowSchema,
} = require("./appointmentWindow.validation");

router.post(
  "/:organizationId/doctors/:doctorId/windows",
  authentication,
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  validate(createAppointmentWindowSchema),
  createOrUpdateAppointmentWindow
);

router.get(
  "/:organizationId/doctors/:doctorId/windows",
  authentication,
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER", "NURSE", "RECEPTIONIST"),
  getDoctorAppointmentWindows
);

module.exports = router;
