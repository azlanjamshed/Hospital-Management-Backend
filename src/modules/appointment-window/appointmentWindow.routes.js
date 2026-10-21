const express = require("express");
const router = express.Router();

const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const validate = require("../../middleware/validate");

const {
  createOrUpdateAppointmentWindow,
  getDoctorAppointmentWindows,
  getAppointmentWindowById,
  updateAppointmentWindow,
  updateAppointmentWindowStatus,
  deleteAppointmentWindow,
} = require("./appointmentWindow.controller");

const {
  createAppointmentWindowSchema,
  updateAppointmentWindowSchema,
  updateAppointmentWindowStatusSchema,
  listAppointmentWindowsQuerySchema,
  appointmentWindowParamsSchema,
} = require("./appointmentWindow.validation");

// =========================================================================
// 1. SPECIFIC SUB-RESOURCE ROUTES (Legacy /windows prefix for backward compatibility)
// =========================================================================

router.patch(
  "/:organizationId/doctors/:doctorId/windows/:windowId/status",
  authentication,
  validate(appointmentWindowParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  validate(updateAppointmentWindowStatusSchema),
  updateAppointmentWindowStatus,
);

router.get(
  "/:organizationId/doctors/:doctorId/windows/:windowId",
  authentication,
  validate(appointmentWindowParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER", "NURSE", "RECEPTIONIST"),
  getAppointmentWindowById,
);

router.patch(
  "/:organizationId/doctors/:doctorId/windows/:windowId",
  authentication,
  validate(appointmentWindowParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  validate(updateAppointmentWindowSchema),
  updateAppointmentWindow,
);

router.delete(
  "/:organizationId/doctors/:doctorId/windows/:windowId",
  authentication,
  validate(appointmentWindowParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  deleteAppointmentWindow,
);

router.post(
  "/:organizationId/doctors/:doctorId/windows",
  authentication,
  validate(appointmentWindowParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  validate(createAppointmentWindowSchema),
  createOrUpdateAppointmentWindow,
);

router.get(
  "/:organizationId/doctors/:doctorId/windows",
  authentication,
  validate(appointmentWindowParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER", "NURSE", "RECEPTIONIST"),
  validate(listAppointmentWindowsQuerySchema, "query"),
  getDoctorAppointmentWindows,
);

// =========================================================================
// 2. CLEAN RESTFUL ROUTES (/api/appointment-windows/:organizationId/doctors/:doctorId/...)
// =========================================================================

router.patch(
  "/:organizationId/doctors/:doctorId/:windowId/status",
  authentication,
  validate(appointmentWindowParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  validate(updateAppointmentWindowStatusSchema),
  updateAppointmentWindowStatus,
);

router.get(
  "/:organizationId/doctors/:doctorId/:windowId",
  authentication,
  validate(appointmentWindowParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER", "NURSE", "RECEPTIONIST"),
  getAppointmentWindowById,
);

router.patch(
  "/:organizationId/doctors/:doctorId/:windowId",
  authentication,
  validate(appointmentWindowParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  validate(updateAppointmentWindowSchema),
  updateAppointmentWindow,
);

router.delete(
  "/:organizationId/doctors/:doctorId/:windowId",
  authentication,
  validate(appointmentWindowParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  deleteAppointmentWindow,
);

router.post(
  "/:organizationId/doctors/:doctorId",
  authentication,
  validate(appointmentWindowParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  validate(createAppointmentWindowSchema),
  createOrUpdateAppointmentWindow,
);

router.get(
  "/:organizationId/doctors/:doctorId",
  authentication,
  validate(appointmentWindowParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER", "NURSE", "RECEPTIONIST"),
  validate(listAppointmentWindowsQuerySchema, "query"),
  getDoctorAppointmentWindows,
);

module.exports = router;
