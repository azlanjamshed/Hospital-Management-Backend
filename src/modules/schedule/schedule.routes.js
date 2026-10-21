const express = require("express");
const router = express.Router();

const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const validate = require("../../middleware/validate");

const {
  createSchedule,
  getDoctorSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
} = require("./schedule.controller");

const {
  createScheduleSchema,
  updateScheduleSchema,
  listSchedulesQuerySchema,
  scheduleParamsSchema,
} = require("./schedule.validation");

// =========================================================================
// 1. SPECIFIC SUB-RESOURCE ROUTES (Legacy duplicated /schedules prefix first)
// =========================================================================

router.get(
  "/:organizationId/doctors/:doctorId/schedules/:scheduleId",
  authentication,
  validate(scheduleParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "NURSE", "MANAGER"),
  getScheduleById,
);

router.patch(
  "/:organizationId/doctors/:doctorId/schedules/:scheduleId",
  authentication,
  validate(scheduleParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  validate(updateScheduleSchema),
  updateSchedule,
);

router.delete(
  "/:organizationId/doctors/:doctorId/schedules/:scheduleId",
  authentication,
  validate(scheduleParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  deleteSchedule,
);

router.post(
  "/:organizationId/doctors/:doctorId/schedules",
  authentication,
  validate(scheduleParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR"),
  validate(createScheduleSchema),
  createSchedule,
);

router.get(
  "/:organizationId/doctors/:doctorId/schedules",
  authentication,
  validate(scheduleParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "NURSE"),
  validate(listSchedulesQuerySchema, "query"),
  getDoctorSchedules,
);

// =========================================================================
// 2. CLEAN RESTFUL ROUTES (/api/schedules/:organizationId/doctors/:doctorId/...)
// =========================================================================

router.get(
  "/:organizationId/doctors/:doctorId/:scheduleId",
  authentication,
  validate(scheduleParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "NURSE", "MANAGER"),
  getScheduleById,
);

router.patch(
  "/:organizationId/doctors/:doctorId/:scheduleId",
  authentication,
  validate(scheduleParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  validate(updateScheduleSchema),
  updateSchedule,
);

router.delete(
  "/:organizationId/doctors/:doctorId/:scheduleId",
  authentication,
  validate(scheduleParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  deleteSchedule,
);

router.post(
  "/:organizationId/doctors/:doctorId",
  authentication,
  validate(scheduleParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR"),
  validate(createScheduleSchema),
  createSchedule,
);

router.get(
  "/:organizationId/doctors/:doctorId",
  authentication,
  validate(scheduleParamsSchema, "params"),
  requireOrganizationRole("ADMIN", "DOCTOR", "NURSE"),
  validate(listSchedulesQuerySchema, "query"),
  getDoctorSchedules,
);

module.exports = router;
