const prescriptionService = require("./prescription.service");

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

    const patientId = req.patient?.id || req.user?.patientId;

    if (!patientId) {
      return res.status(403).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const prescription = await prescriptionService.getPatientPrescription({
      prescriptionId,
      patientId,
    });

    return res.status(200).json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to get prescription",
    });
  }
};

module.exports = {
  createPrescription,
  getPrescription,
  getPatientPrescription,
};
