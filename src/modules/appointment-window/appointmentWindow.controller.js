const appointmentWindowService = require("./appointmentWindow.service");

const createOrUpdateAppointmentWindow = async (req, res) => {
  try {
    const { organizationId, doctorId } = req.params;
    const window =
      await appointmentWindowService.createOrUpdateAppointmentWindow(
        organizationId,
        doctorId,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Appointment window saved successfully",
      data: window,
    });
  } catch (error) {
    console.error("Save appointment window error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to save appointment window",
    });
  }
};

const getDoctorAppointmentWindows = async (req, res) => {
  try {
    const { organizationId, doctorId } = req.params;
    const windows =
      await appointmentWindowService.getDoctorAppointmentWindows(
        organizationId,
        doctorId,
        req.query
      );

    return res.status(200).json({
      success: true,
      data: windows,
    });
  } catch (error) {
    console.error("Get appointment windows error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve appointment windows",
    });
  }
};

module.exports = {
  createOrUpdateAppointmentWindow,
  getDoctorAppointmentWindows,
};
