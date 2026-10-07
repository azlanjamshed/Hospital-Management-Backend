const express = require("express");

const router = express.Router();

const authentication = require("../../middleware/auth");
const validate = require("../../middleware/validate");

const {
  doctorAvailabilityQuerySchema,
} = require("./doctorAvailability.validation");

const { getDoctorAvailability } = require("./doctorAvailability.controller");
const doctorAvailabilityAccess = require("../../middleware/doctorAvailabilityAccess");

router.get(
  "/:organizationId/doctors/:doctorId",
  authentication,
  doctorAvailabilityAccess,
  validate(doctorAvailabilityQuerySchema, "query"),
  getDoctorAvailability,
);

module.exports = router;
