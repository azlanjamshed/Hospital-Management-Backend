const appointmentWindowService = require("./appointmentWindow.service");

const createOrUpdateAppointmentWindow = async (req, res) => {
  try {
    const { organizationId, doctorId } = req.params;
    const window =
      await appointmentWindowService.createOrUpdateAppointmentWindow(
        organizationId,
        doctorId,
        req.body,
      );

    return res.status(200).json({
      success: true,
      message: "Appointment window saved successfully",
      data: window,
    });
  } catch (error) {
    if (!error.statusCode) {
      console.error("Save appointment window error:", error);
    }
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to save appointment window",
    });
  }
};

const getDoctorAppointmentWindows = async (req, res) => {
  try {
    const { organizationId, doctorId } = req.params;
    const result =
      await appointmentWindowService.getDoctorAppointmentWindows(
        organizationId,
        doctorId,
        req.query,
      );

    if (result && result.windows && result.pagination) {
      return res.status(200).json({
        success: true,
        data: result.windows,
        pagination: result.pagination,
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (!error.statusCode) {
      console.error("Get appointment windows error:", error);
    }
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve appointment windows",
    });
  }
};

const getAppointmentWindowById = async (req, res) => {
  try {
    const { organizationId, doctorId, windowId } = req.params;
    const window = await appointmentWindowService.getAppointmentWindowById(
      organizationId,
      doctorId,
      windowId,
    );

    return res.status(200).json({
      success: true,
      data: window,
    });
  } catch (error) {
    if (!error.statusCode) {
      console.error("Get appointment window by ID error:", error);
    }
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve appointment window",
    });
  }
};

const updateAppointmentWindow = async (req, res) => {
  try {
    const { organizationId, doctorId, windowId } = req.params;
    const window = await appointmentWindowService.updateAppointmentWindow(
      organizationId,
      doctorId,
      windowId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Appointment window updated successfully",
      data: window,
    });
  } catch (error) {
    if (!error.statusCode) {
      console.error("Update appointment window error:", error);
    }
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update appointment window",
    });
  }
};

const updateAppointmentWindowStatus = async (req, res) => {
  try {
    const { organizationId, doctorId, windowId } = req.params;
    const window =
      await appointmentWindowService.updateAppointmentWindowStatus(
        organizationId,
        doctorId,
        windowId,
        req.body.status,
      );

    return res.status(200).json({
      success: true,
      message: "Appointment window status updated successfully",
      data: window,
    });
  } catch (error) {
    if (!error.statusCode) {
      console.error("Update appointment window status error:", error);
    }
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update appointment window status",
    });
  }
};

const deleteAppointmentWindow = async (req, res) => {
  try {
    const { organizationId, doctorId, windowId } = req.params;
    const result = await appointmentWindowService.deleteAppointmentWindow(
      organizationId,
      doctorId,
      windowId,
    );

    return res.status(200).json({
      success: true,
      message: "Appointment window deleted successfully",
      data: result,
    });
  } catch (error) {
    if (!error.statusCode) {
      console.error("Delete appointment window error:", error);
    }
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete appointment window",
    });
  }
};

module.exports = {
  createOrUpdateAppointmentWindow,
  getDoctorAppointmentWindows,
  getAppointmentWindowById,
  updateAppointmentWindow,
  updateAppointmentWindowStatus,
  deleteAppointmentWindow,
};
