const availabilityService = require("./availability.service");

const getAvailability = async (req, res) => {
  try {
    const { organizationId, doctorId } = req.params;
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
    if (!error.statusCode) {
      console.error("Get availability error:", error);
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch doctor availability",
    });
  }
};

const listAvailableDoctors = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const result = await availabilityService.listAvailableDoctors(
      organizationId,
      req.query,
    );

    if (result && result.pagination) {
      return res.status(200).json({
        success: true,
        message: "Available doctors fetched successfully",
        data: result.doctors,
        pagination: result.pagination,
        date: result.date,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Available doctors fetched successfully",
      data: result.doctors,
      total: result.total,
      date: result.date,
    });
  } catch (error) {
    if (!error.statusCode) {
      console.error("List available doctors error:", error);
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to list available doctors",
    });
  }
};

module.exports = {
  getAvailability,
  getDoctorAvailability: getAvailability,
  listAvailableDoctors,
};
