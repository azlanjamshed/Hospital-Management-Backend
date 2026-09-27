const availabilityService = require("./availability.service");

const getAvailability = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { doctorId } = req.params;
    const { date } = req.query;

    const availability = await availabilityService.getAvailability(
      organizationId,
      doctorId,
      date,
    );

    return res.status(200).json({
      success: true,
      message: "Doctor availability fetched successfully",
      data: availability,
    });
  } catch (error) {
    console.error("Get availability error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch doctor availability",
    });
  }
};

module.exports = {
  getAvailability,
};
