const scheduleService = require("./schedule.service");

const createSchedule = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { doctorId } = req.params;

    const schedule = await scheduleService.createSchedule(
      organizationId,
      doctorId,
      req.body,
    );

    return res.status(201).json({
      success: true,
      message: "Doctor schedule created successfully",
      data: schedule,
    });
  } catch (error) {
    console.error("Create schedule error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create schedule",
    });
  }
};

const getDoctorSchedules = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { doctorId } = req.params;

    const schedules = await scheduleService.getDoctorSchedules(
      organizationId,
      doctorId,
    );

    return res.status(200).json({
      success: true,
      message: "Doctor schedules fetched successfully",
      data: schedules,
    });
  } catch (error) {
    console.error("Get doctor schedules error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch doctor schedules",
    });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { doctorId, scheduleId } = req.params;

    const schedule = await scheduleService.updateSchedule(
      organizationId,
      doctorId,
      scheduleId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Doctor schedule updated successfully",
      data: schedule,
    });
  } catch (error) {
    console.error("Update schedule error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update schedule",
    });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { doctorId, scheduleId } = req.params;

    const result = await scheduleService.deleteSchedule(
      organizationId,
      doctorId,
      scheduleId,
    );

    return res.status(200).json({
      success: true,
      message: "Doctor schedule deleted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Delete schedule error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to delete schedule",
    });
  }
};
module.exports = {
  createSchedule,
  getDoctorSchedules,
  updateSchedule,
  deleteSchedule,
};
