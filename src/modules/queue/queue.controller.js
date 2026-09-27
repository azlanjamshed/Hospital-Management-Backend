const queueService = require("./queue.service");

const checkInAppointment = async (req, res) => {
  try {
    const { organizationId, appointmentId } = req.params;

    const result = await queueService.checkInAppointment({
      organizationId,
      appointmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Appointment checked in successfully",
      data: result,
    });
  } catch (error) {
    console.error("Check-in appointment error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to check in appointment",
    });
  }
};

const callAppointment = async (req, res) => {
  try {
    const { organizationId, appointmentId } = req.params;

    const result = await queueService.callAppointment({
      organizationId,
      appointmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Appointment called successfully",
      data: result,
    });
  } catch (error) {
    console.error("Call appointment error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to call appointment",
    });
  }
};

const startConsultation = async (req, res) => {
  try {
    const { organizationId, appointmentId } = req.params;

    const result = await queueService.startConsultation({
      organizationId,
      appointmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Consultation started successfully",
      data: result,
    });
  } catch (error) {
    console.error("Start consultation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to start consultation",
    });
  }
};
module.exports = {
  checkInAppointment,
  callAppointment,
  startConsultation,
};
