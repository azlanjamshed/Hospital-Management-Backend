const consultationService = require("./consultation.service");
const { updateConsultationSchema } = require("./consultation.validation");

const updateConsultation = async (req, res) => {
  try {
    const { organizationId, consultationId } = req.params;

    // Validate request body
    const validatedData = updateConsultationSchema.parse(req.body);

    // Doctor ID comes from organization middleware or authenticated user
    const doctorId = req.doctor?.id || req.user?.doctorId;

    if (!doctorId) {
      return res.status(403).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const consultation = await consultationService.updateConsultation({
      organizationId,
      consultationId,
      doctorId,
      data: validatedData,
    });

    return res.status(200).json({
      success: true,
      message: "Consultation updated successfully",
      data: consultation,
    });
  } catch (error) {
    console.error("Update consultation error:", error);

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update consultation",
    });
  }
};

const completeConsultation = async (req, res) => {
  try {
    const { organizationId, consultationId } = req.params;

    const doctorId = req.doctor?.id || req.user?.doctorId;

    if (!doctorId) {
      return res.status(403).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const result = await consultationService.completeConsultation({
      organizationId,
      consultationId,
      doctorId,
    });

    return res.status(200).json({
      success: true,
      message: "Consultation completed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Complete consultation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to complete consultation",
    });
  }
};
const getConsultation = async (req, res) => {
  try {
    const { organizationId, consultationId } = req.params;

    const result = await consultationService.getConsultation({
      organizationId,
      consultationId,
    });

    return res.status(200).json({
      success: true,
      message: "Consultation fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Get consultation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch consultation",
    });
  }
};

module.exports = {
  updateConsultation,
  completeConsultation,
  getConsultation,
};
