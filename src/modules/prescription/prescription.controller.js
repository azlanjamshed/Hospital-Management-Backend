const prescriptionService = require("./prescription.service");
const prisma = require("../../config/prisma");
const prescriptionPdfService = require("./prescription.pdf.service");

const createPrescription = async (req, res) => {
  try {
    const organizationId = req.params.organizationId;
    const consultationId = req.params.consultationId;

    // req.doctor is attached by the organization middleware
    const doctorId = req.doctor?.id || req.user?.doctorId;

    if (!doctorId) {
      return res.status(403).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const prescription = await prescriptionService.createPrescription({
      organizationId,
      consultationId,
      doctorId,
      items: req.body.items,
    });

    return res.status(201).json({
      success: true,
      message: "Prescription created successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Create prescription error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create prescription",
    });
  }
};

const getPrescription = async (req, res) => {
  try {
    const organizationId = req.params.organizationId;
    const prescriptionId = req.params.prescriptionId;

    const prescription = await prescriptionService.getPrescription({
      organizationId,
      prescriptionId,
    });

    return res.status(200).json({
      success: true,
      message: "Prescription fetched successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Get prescription error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch prescription",
    });
  }
};
const getPatientPrescription = async (req, res) => {
  try {
    const prescriptionId = req.params.prescriptionId;

    // Only PATIENT role can use this endpoint
    if (req.user.role !== "PATIENT") {
      return res.status(403).json({
        success: false,
        message: "This endpoint is for patients only",
      });
    }

    // JWT only has userId — look up the patient record
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.userId },
    });

    if (!patient) {
      return res.status(403).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const prescription = await prescriptionService.getPatientPrescription({
      prescriptionId,
      patientId: patient.id,
    });

    return res.status(200).json({
      success: true,
      message: "Prescription fetched successfully",
      data: prescription,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to get prescription",
    });
  }
};
const getPrescriptionPrintData = async (req, res) => {
  try {
    const organizationId = req.params.organizationId;
    const prescriptionId = req.params.prescriptionId;

    const prescription = await prescriptionService.getPrescriptionPrintData({
      organizationId,
      prescriptionId,
    });

    return res.status(200).json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to get prescription print data",
    });
  }
};
const generatePrescriptionPdf = async (req, res) => {
  try {
    const organizationId = req.params.organizationId;
    const prescriptionId = req.params.prescriptionId;

    const data = await prescriptionService.getPrescriptionPrintData({
      organizationId,
      prescriptionId,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="prescription-${prescriptionId}.pdf"`,
    );

    prescriptionPdfService.generatePrescriptionPdf(data, res);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to generate prescription PDF",
    });
  }
};
const generatePatientPrescriptionPdf = async (req, res) => {
  try {
    const prescriptionId = req.params.prescriptionId;

    const patientId = req.patient?.id;

    if (!patientId) {
      return res.status(403).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="prescription-${prescriptionId}.pdf"`,
    );

    await prescriptionPdfService.generatePatientPrescriptionPdf({
      prescriptionId,
      patientId,
      res,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to generate prescription PDF",
    });
  }
};
module.exports = {
  createPrescription,
  getPrescription,
  getPatientPrescription,
  getPrescriptionPrintData,
  generatePrescriptionPdf,
  generatePatientPrescriptionPdf,
};
