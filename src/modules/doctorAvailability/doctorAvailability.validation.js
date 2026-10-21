const {
  availabilityParamsSchema,
  getAvailabilityQuerySchema,
  listAvailableDoctorsQuerySchema,
} = require("../availability/availability.validation");

module.exports = {
  availabilityParamsSchema,
  doctorAvailabilityParamsSchema: availabilityParamsSchema,
  doctorAvailabilityQuerySchema: getAvailabilityQuerySchema,
  getAvailabilityQuerySchema,
  listAvailableDoctorsQuerySchema,
};
