const departmentService = require("./department.service");

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
    console.error("Create department error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create department",
    });
  }
};

const getDepartments = async (req, res) => {
  try {
    const organizationId = req.organization.id;

    const departments = await departmentService.getDepartments(organizationId);

    return res.status(200).json({
      success: true,
      message: "Departments fetched successfully",
      data: departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
    });
  }
};

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
    console.error("Get department error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to fetch department",
    });
  }
};

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
    console.error("Update department error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update department",
    });
  }
};

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
  updateDepartment,
  updateDepartmentStatus,
};
