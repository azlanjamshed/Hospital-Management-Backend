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

module.exports = {
  createDoctor,
  getDoctors,
  getDoctorById,
};
