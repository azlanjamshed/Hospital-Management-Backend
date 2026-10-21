const express = require("express");
const router = express.Router();

const authentication = require("../../middleware/auth");
const doctorAvailabilityAccess = require("../../middleware/doctorAvailabilityAccess");
const validate = require("../../middleware/validate");

const {
  getDoctorAvailability,
  listAvailableDoctors,
} = require("./doctorAvailability.controller");

const {
  doctorAvailabilityParamsSchema,
  doctorAvailabilityQuerySchema,
  listAvailableDoctorsQuerySchema,
} = require("./doctorAvailability.validation");

// 1. Specific sub-resource legacy routes
router.get(
  "/:organizationId/doctors/:doctorId/doctor-availability",
  authentication,
  validate(doctorAvailabilityParamsSchema, "params"),
  doctorAvailabilityAccess,
  validate(doctorAvailabilityQuerySchema, "query"),
  getDoctorAvailability,
);

router.get(
  "/:organizationId/doctors/:doctorId/availability",
  authentication,
  validate(doctorAvailabilityParamsSchema, "params"),
  doctorAvailabilityAccess,
  validate(doctorAvailabilityQuerySchema, "query"),
  getDoctorAvailability,
);

// 2. Clean RESTful route for doctor date-specific availability
router.get(
  "/:organizationId/doctors/:doctorId",
  authentication,
  validate(doctorAvailabilityParamsSchema, "params"),
  doctorAvailabilityAccess,
  validate(doctorAvailabilityQuerySchema, "query"),
  getDoctorAvailability,
);

// 3. List available doctors in organization
router.get(
  "/:organizationId/doctors",
  authentication,
  validate(doctorAvailabilityParamsSchema, "params"),
  doctorAvailabilityAccess,
  validate(listAvailableDoctorsQuerySchema, "query"),
  listAvailableDoctors,
);

module.exports = router;
