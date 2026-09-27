const express = require("express");
const {
  createAppointment,
  confirmAppointment,
} = require("./appointment.controller");
const { createAppointmentSchema } = require("./appointment.validation");

const validate = require("../../middleware/validate");
const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");

const router = express.Router();

router.post(
  "/:organizationId",
  authentication,
  validate(createAppointmentSchema),
  createAppointment,
);

router.patch(
  "/:organizationId/:appointmentId/confirm",
  authentication,
  requireOrganizationRole("ADMIN", "MANAGER", "RECEPTIONIST", "NURSE"),
  confirmAppointment,
);
module.exports = router;
