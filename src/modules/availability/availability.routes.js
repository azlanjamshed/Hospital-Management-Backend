const express = require("express");
const router = express.Router();

const authentication = require("../../middleware/auth");
const requireAvailabilityAccess = require("../../middleware/availability");
const validate = require("../../middleware/validate");

const {
  getAvailability,
  listAvailableDoctors,
} = require("./availability.controller");

const {
  availabilityParamsSchema,
  getAvailabilityQuerySchema,
  listAvailableDoctorsQuerySchema,
} = require("./availability.validation");

// 1. Specific sub-resource route (legacy /availability suffix)
router.get(
  "/:organizationId/doctors/:doctorId/availability",
  authentication,
  validate(availabilityParamsSchema, "params"),
  requireAvailabilityAccess,
  validate(getAvailabilityQuerySchema, "query"),
  getAvailability,
);

// 2. Clean RESTful route for doctor date-specific availability
router.get(
  "/:organizationId/doctors/:doctorId",
  authentication,
  validate(availabilityParamsSchema, "params"),
  requireAvailabilityAccess,
  validate(getAvailabilityQuerySchema, "query"),
  getAvailability,
);

// 3. List available doctors in organization for a date
router.get(
  "/:organizationId/doctors",
  authentication,
  validate(availabilityParamsSchema, "params"),
  requireAvailabilityAccess,
  validate(listAvailableDoctorsQuerySchema, "query"),
  listAvailableDoctors,
);

module.exports = router;
