const organizationStaffService = require("./organization-staff.service");

const createDoctor = async (req, res) => {
  try {
    const organizationId = req.organization.id;

    const result = await organizationStaffService.createDoctor(
      organizationId,
      req.body,
    );

    return res.status(201).json({
      success: true,
      message: "Doctor created successfully",
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
        },
        doctor: {
          id: result.doctor.id,
          organizationId: result.doctor.organizationId,
          qualification: result.doctor.qualification,
          registrationNumber: result.doctor.registrationNumber,
          consultationFeeMinor: result.doctor.consultationFeeMinor,
        },
      },
    });
  } catch (error) {
    console.error("Create doctor error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create doctor",
    });
  }
};

const getDoctors = async (req, res) => {
  try {
    const organizationId = req.organization.id;

    const doctors = await organizationStaffService.getDoctors(organizationId);

    return res.status(200).json({
      success: true,
      message: "Doctors fetched successfully",
      data: doctors,
    });
  } catch (error) {
    console.error("Get doctors error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctors",
    });
  }
};
const getDoctorById = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { doctorId } = req.params;

    const doctor = await organizationStaffService.getDoctorById(
      organizationId,
      doctorId,
    );

    return res.status(200).json({
      success: true,
      message: "Doctor fetched successfully",
      data: doctor,
    });
  } catch (error) {
    console.error("Get doctor error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to fetch doctor",
    });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { doctorId } = req.params;

    const doctor = await organizationStaffService.updateDoctor(
      organizationId,
      doctorId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Doctor updated successfully",
      data: doctor,
    });
  } catch (error) {
    console.error("Update doctor error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update doctor",
    });
  }
};

const updateDoctorStatus = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { doctorId } = req.params;
    const { status } = req.body;

    const doctor = await organizationStaffService.updateDoctorStatus(
      organizationId,
      doctorId,
      status,
    );

    return res.status(200).json({
      success: true,
      message: `Doctor status updated to ${doctor.status}`,
      data: {
        id: doctor.id,
        organizationId: doctor.organizationId,
        status: doctor.status,
      },
    });
  } catch (error) {
    console.error("Update doctor status error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to update doctor status",
    });
  }
};

const updateDoctorDepartments = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { doctorId } = req.params;
    const { departmentIds } = req.body;

    const doctor = await organizationStaffService.updateDoctorDepartments(
      organizationId,
      doctorId,
      departmentIds,
    );

    return res.status(200).json({
      success: true,
      message: "Doctor departments updated successfully",
      data: {
        id: doctor.id,
        name: doctor.name,
        departments: doctor.departments.map((item) => ({
          id: item.department.id,
          name: item.department.name,
          status: item.department.status,
        })),
      },
    });
  } catch (error) {
    console.error("Update doctor departments error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to update doctor departments",
    });
  }
};

const createStaff = async (req, res) => {
  try {
    const organizationId = req.organization.id;

    const result = await organizationStaffService.createStaff(
      organizationId,
      req.body,
    );

    return res.status(201).json({
      success: true,
      message: "Staff created successfully",
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
        },
        membership: {
          id: result.membership.id,
          organizationId: result.membership.organizationId,
          role: result.membership.role,
          status: result.membership.status,
        },
      },
    });
  } catch (error) {
    console.error("Create staff error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create staff",
    });
  }
};

const getStaff = async (req, res) => {
  try {
    const organizationId = req.organization.id;

    const staff = await organizationStaffService.getStaff(organizationId);

    return res.status(200).json({
      success: true,
      message: "Staff fetched successfully",
      data: staff,
    });
  } catch (error) {
    console.error("Get staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch staff",
    });
  }
};

const getStaffById = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { staffId } = req.params;

    const staff = await organizationStaffService.getStaffById(
      organizationId,
      staffId,
    );

    return res.status(200).json({
      success: true,
      message: "Staff fetched successfully",
      data: staff,
    });
  } catch (error) {
    console.error("Get staff by ID error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to fetch staff",
    });
  }
};
const updateStaff = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { staffId } = req.params;

    const result = await organizationStaffService.updateStaff(
      organizationId,
      staffId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Staff updated successfully",
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
        },
        membership: {
          id: result.membership.id,
          organizationId: result.membership.organizationId,
          role: result.membership.role,
          status: result.membership.status,
        },
      },
    });
  } catch (error) {
    console.error("Update staff error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update staff",
    });
  }
};

const updateStaffStatus = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { staffId } = req.params;
    const { status } = req.body;

    const membership = await organizationStaffService.updateStaffStatus(
      organizationId,
      staffId,
      status,
    );

    return res.status(200).json({
      success: true,
      message: `Staff status updated to ${membership.status}`,
      data: {
        id: membership.id,
        organizationId: membership.organizationId,
        role: membership.role,
        status: membership.status,
      },
    });
  } catch (error) {
    console.error("Update staff status error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to update staff status",
    });
  }
};
module.exports = {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  updateDoctorStatus,
  updateDoctorDepartments,

  createStaff,
  getStaff,
  getStaffById,
  updateStaff,
  updateStaffStatus,
};
