const express = require("express");
const router = express.Router();
const { getAvailability } = require("./availability.controller");
const { getAvailabilitySchema } = require("./availability.validation");
const validate = require("../../middleware/validate");
const authentication = require("../../middleware/auth");
const requireAvailabilityAccess = require("../../middleware/availability");

router.get(
  "/:organizationId/doctors/:doctorId",
  authentication,
  requireAvailabilityAccess,
  validate(getAvailabilitySchema, "query"),
  getAvailability,
);
module.exports = router;
