const doctorAvailabilityService = require("./doctorAvailability.service");

const getDoctorAvailability = async (req, res) => {
  try {
    const { organizationId, doctorId } = req.params;
    const { date } = req.query;

    const availability = await doctorAvailabilityService.getDoctorAvailability(
      organizationId,
      doctorId,
      date,
    );

    return res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error("Get doctor availability error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to get doctor availability",
    });
  }
};

module.exports = {
  getDoctorAvailability,
};
