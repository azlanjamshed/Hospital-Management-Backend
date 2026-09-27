const appointmentService = require("./appointment.service");
const prisma = require("../../config/prisma");

const createAppointment = async (req, res) => {
  try {
    console.log("➡️ Appointment controller reached");

    const { organizationId } = req.params;

    console.log("Organization:", organizationId);
    console.log("Body:", req.body);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Staff must belong to this organization
    if (req.user.role !== "PATIENT") {
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
    }

    let patientId = req.body.patientId;

    // Patient books for themselves
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

      patientId = patient.id;
    } else {
      // Staff booking
      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: "Patient ID is required",
        });
      }

      let patient = await prisma.patient.findUnique({
        where: {
          id: patientId,
        },
      });

      if (!patient) {
        patient = await prisma.patient.findUnique({
          where: {
            userId: patientId,
          },
        });
      }

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }

      patientId = patient.id;
    }

    const appointment = await appointmentService.createAppointment({
      organizationId,
      patientId,
      doctorId: req.body.doctorId,
      appointmentDate: req.body.appointmentDate,
      paymentMethod: req.body.paymentMethod,
      source: req.body.source,
    });

    console.log("✅ Appointment created");

    return res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Create appointment error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to create appointment",
    });
  }
};

const confirmAppointment = async (req, res) => {
  try {
    const { organizationId, appointmentId } = req.params;

    const appointment = await appointmentService.confirmAppointment({
      organizationId,
      appointmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Appointment confirmed successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Confirm appointment error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to confirm appointment",
    });
  }
};

module.exports = {
  createAppointment,
  confirmAppointment,
};