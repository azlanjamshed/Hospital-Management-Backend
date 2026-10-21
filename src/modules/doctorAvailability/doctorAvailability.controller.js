const availabilityController = require("../availability/availability.controller");

module.exports = {
  getDoctorAvailability: availabilityController.getAvailability,
  getAvailability: availabilityController.getAvailability,
  listAvailableDoctors: availabilityController.listAvailableDoctors,
};
