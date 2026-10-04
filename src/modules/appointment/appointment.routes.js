const express = require("express");
const {
  createAppointment,
  confirmAppointment,
  getPatientUpcomingAppointments,
  cancelAppointment,
  getAppointmentById,
  getPatientAppointmentHistory,
  getOrganizationAppointments,
  markAppointmentNoShow,
  getDoctorAppointments,
} = require("./appointment.controller");
const {
  createAppointmentSchema,
  organizationAppointmentsQuerySchema,
} = require("./appointment.validation");

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
router.get(
  "/:organizationId/upcoming",
  authentication,
  getPatientUpcomingAppointments,
);
router.patch(
  "/:organizationId/:appointmentId/confirm",
  authentication,
  requireOrganizationRole("ADMIN", "MANAGER", "RECEPTIONIST", "NURSE"),
  confirmAppointment,
);
router.patch(
  "/:organizationId/:appointmentId/cancel",
  authentication,
  cancelAppointment,
);
router.patch(
  "/:organizationId/:appointmentId/no-show",
  authentication,
  markAppointmentNoShow,
);
router.get(
  "/:organizationId/history",
  authentication,
  getPatientAppointmentHistory,
);
router.get(
  "/:organizationId/doctor/:doctorId",
  authentication,
  getDoctorAppointments,
);
router.get(
  "/:organizationId/:appointmentId",
  authentication,
  getAppointmentById,
);
router.get(
  "/:organizationId",
  authentication,
  validate(organizationAppointmentsQuerySchema, "query"),
  getOrganizationAppointments,
);

module.exports = router;
