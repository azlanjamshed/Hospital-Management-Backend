const express = require("express");
const router = express.Router();
const validate = require("../../middleware/validate");
const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const {
  createSchedule,
  getDoctorSchedules,
  updateSchedule,
  deleteSchedule,
} = require("./schedule.controller");
const {
  createScheduleSchema,
  updateScheduleSchema,
} = require("./schedule.validation");

router.post(
  "/:organizationId/doctors/:doctorId/schedules",
  authentication,
  requireOrganizationRole("ADMIN", "DOCTOR"),
  validate(createScheduleSchema),
  createSchedule,
);

router.get(
  "/:organizationId/doctors/:doctorId/schedules",
  authentication,
  requireOrganizationRole("ADMIN", "DOCTOR", "NURSE"),

  getDoctorSchedules,
);
router.patch(
  "/:organizationId/doctors/:doctorId/schedules/:scheduleId",
  authentication,
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  validate(updateScheduleSchema),
  updateSchedule,
);

router.delete(
  "/:organizationId/doctors/:doctorId/schedules/:scheduleId",
  authentication,
  requireOrganizationRole("ADMIN", "DOCTOR", "MANAGER"),
  deleteSchedule,
);
module.exports = router;
