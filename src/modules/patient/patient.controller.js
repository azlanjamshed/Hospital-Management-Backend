const patientService = require("./patient.service");

const createPatient = async (req, res) => {
  try {
    const organizationId = req.organization.id;

    const result = await patientService.createPatient(organizationId, req.body);

    return res.status(201).json({
      success: true,
      message: result.existingPatient
        ? "Existing patient linked to organization successfully"
        : "Patient created successfully",
      data: {
        patient: result.patient,
        patientOrganization: result.patientOrganization,
      },
    });
  } catch (error) {
    console.error("Create patient error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to create patient",
    });
  }
};

const searchPatients = async (req, res) => {
  try {
    const organizationId = req.organization.id;

    const patients = await patientService.searchPatients(
      organizationId,
      req.query,
    );

    return res.status(200).json({
      success: true,
      message: "Patients fetched successfully",
      data: patients,
    });
  } catch (error) {
    console.error("Search patients error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to search patients",
    });
  }
};
const linkPatientToOrganization = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { patientId } = req.params;

    const patientOrganization = await patientService.linkPatientToOrganization(
      organizationId,
      patientId,
    );

    return res.status(201).json({
      success: true,
      message: "Patient linked to organization successfully",
      data: patientOrganization,
    });
  } catch (error) {
    console.error("Link patient error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to link patient",
    });
  }
};
const getPatientById = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const { patientId } = req.params;

    const patient = await patientService.getPatientById(
      organizationId,
      patientId,
    );

    return res.status(200).json({
      success: true,
      message: "Patient fetched successfully",
      data: patient,
    });
  } catch (error) {
    console.error("Get patient error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to fetch patient",
    });
  }
};
module.exports = {
  createPatient,
  searchPatients,
  linkPatientToOrganization,
  getPatientById,
};
