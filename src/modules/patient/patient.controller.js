const patientService = require("./patient.service");
const prisma = require("../../config/prisma");

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

const getPatientAppointments = async (req, res) => {
  try {
    const { organizationId, patientId } = req.params;

    const history = await patientService.getPatientAppointments({
      organizationId,
      patientId,
    });

    return res.status(200).json({
      success: true,
      message: "Patient appointment history fetched successfully",
      data: history,
    });
  } catch (error) {
    console.error("Get patient appointment history error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch patient appointment history",
    });
  }
};
const getPatientMedicalHistory = async (req, res) => {
  try {
    const { organizationId, patientId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // PATIENT → can only view their own medical history
    if (req.user.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({
        where: {
          userId: req.user.userId,
        },
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient profile not found",
        });
      }

      if (patient.id !== patientId) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this patient's history",
        });
      }
    }

    // DOCTOR → must belong to this organization
    else if (req.user.role === "DOCTOR") {
      const doctor = await prisma.doctor.findFirst({
        where: {
          userId: req.user.userId,
          organizationId,
          status: "ACTIVE",
        },
      });

      if (!doctor) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this organization",
        });
      }
    }

    // STAFF → must be active member of this organization
    else {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId,
          },
        },
      });

      if (!membership || membership.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this organization",
        });
      }

      // Receptionist should not access clinical medical history
      if (!["ADMIN", "MANAGER", "NURSE"].includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to view medical history",
        });
      }
    }

    const history = await patientService.getPatientMedicalHistory({
      organizationId,
      patientId,
    });

    return res.status(200).json({
      success: true,
      message: "Patient medical history fetched successfully",
      data: history,
    });
  } catch (error) {
    console.error("Get patient medical history error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch patient medical history",
    });
  }
};
module.exports = {
  createPatient,
  searchPatients,
  linkPatientToOrganization,
  getPatientById,
  getPatientAppointments,
  getPatientMedicalHistory,
};
