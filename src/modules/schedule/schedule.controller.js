const scheduleService = require("./schedule.service");

/**
 * POST /api/schedules/:organizationId/doctors/:doctorId
 */
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
    if (!error.statusCode) console.error("Create schedule error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create schedule",
    });
  }
};

/**
 * GET /api/schedules/:organizationId/doctors/:doctorId
 */
const getDoctorSchedules = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { doctorId } = req.params;

    const result = await scheduleService.getDoctorSchedules(
      organizationId,
      doctorId,
      req.query,
    );

    if (result && result.pagination) {
      return res.status(200).json({
        success: true,
        message: "Doctor schedules fetched successfully",
        data: result.schedules,
        pagination: result.pagination,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Doctor schedules fetched successfully",
      data: result,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Get doctor schedules error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch doctor schedules",
    });
  }
};

/**
 * GET /api/schedules/:organizationId/doctors/:doctorId/:scheduleId
 */
const getScheduleById = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { doctorId, scheduleId } = req.params;

    const schedule = await scheduleService.getScheduleById(
      organizationId,
      doctorId,
      scheduleId,
    );

    return res.status(200).json({
      success: true,
      message: "Doctor schedule fetched successfully",
      data: schedule,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Get schedule by ID error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to fetch schedule",
    });
  }
};

/**
 * PATCH /api/schedules/:organizationId/doctors/:doctorId/:scheduleId
 */
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
    if (!error.statusCode) console.error("Update schedule error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update schedule",
    });
  }
};

/**
 * DELETE /api/schedules/:organizationId/doctors/:doctorId/:scheduleId
 */
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
    if (!error.statusCode) console.error("Delete schedule error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to delete schedule",
    });
  }
};

module.exports = {
  createSchedule,
  getDoctorSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
};
