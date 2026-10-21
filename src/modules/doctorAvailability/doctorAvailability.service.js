const availabilityService = require("../availability/availability.service");

module.exports = {
  getDoctorAvailability: availabilityService.getAvailability,
  getAvailability: availabilityService.getAvailability,
  listAvailableDoctors: availabilityService.listAvailableDoctors,
};
