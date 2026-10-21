const departmentService = require("./department.service");

/**
 * POST /api/departments/:organizationId
 */
const createDepartment = async (req, res) => {
  try {
    const organizationId = req.organization.id;

    const department = await departmentService.createDepartment(
      organizationId,
      req.body,
    );

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Create department error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create department",
    });
  }
};

/**
 * GET /api/departments/:organizationId
 */
const getDepartments = async (req, res) => {
  try {
    const organizationId = req.organization.id;

    const result = await departmentService.getDepartments(
      organizationId,
      req.query,
    );

    return res.status(200).json({
      success: true,
      message: "Departments fetched successfully",
      data: result.departments,
      pagination: result.pagination,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Get departments error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to fetch departments",
    });
  }
};

/**
 * GET /api/departments/:organizationId/:departmentId
 */
const getDepartmentById = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { departmentId } = req.params;

    const department = await departmentService.getDepartmentById(
      organizationId,
      departmentId,
    );

    return res.status(200).json({
      success: true,
      message: "Department fetched successfully",
      data: department,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Get department error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to fetch department",
    });
  }
};

/**
 * GET /api/departments/:organizationId/:departmentId/doctors
 */
const getDepartmentDoctors = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { departmentId } = req.params;

    const result = await departmentService.getDepartmentDoctors(
      organizationId,
      departmentId,
      req.query,
    );

    return res.status(200).json({
      success: true,
      message: "Department doctors fetched successfully",
      department: result.department,
      data: result.doctors,
      pagination: result.pagination,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Get department doctors error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch department doctors",
    });
  }
};

/**
 * PATCH /api/departments/:organizationId/:departmentId
 */
const updateDepartment = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { departmentId } = req.params;

    const department = await departmentService.updateDepartment(
      organizationId,
      departmentId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: department,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Update department error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update department",
    });
  }
};

/**
 * PATCH /api/departments/:organizationId/:departmentId/status
 */
const updateDepartmentStatus = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { departmentId } = req.params;
    const { status } = req.body;

    const department = await departmentService.updateDepartmentStatus(
      organizationId,
      departmentId,
      status,
    );

    return res.status(200).json({
      success: true,
      message: `Department status updated to ${department.status}`,
      data: {
        id: department.id,
        organizationId: department.organizationId,
        name: department.name,
        status: department.status,
      },
    });
  } catch (error) {
    if (!error.statusCode)
      console.error("Update department status error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to update department status",
    });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  getDepartmentDoctors,
  updateDepartment,
  updateDepartmentStatus,
};
