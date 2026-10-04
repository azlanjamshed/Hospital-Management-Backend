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

const getPatientUpcomingAppointments = async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Only patients can access their own upcoming appointments
    if (req.user.role !== "PATIENT") {
      return res.status(403).json({
        success: false,
        message: "Only patients can access this resource",
      });
    }

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

    // Verify patient belongs to this organization
    const patientOrganization = await prisma.patientOrganization.findUnique({
      where: {
        patientId_organizationId: {
          patientId: patient.id,
          organizationId,
        },
      },
    });

    if (!patientOrganization) {
      return res.status(403).json({
        success: false,
        message: "You do not belong to this organization",
      });
    }

    const appointments =
      await appointmentService.getPatientUpcomingAppointments({
        organizationId,
        patientId: patient.id,
      });

    return res.status(200).json({
      success: true,
      message: "Upcoming appointments fetched successfully",
      data: appointments,
    });
  } catch (error) {
    console.error("Get upcoming appointments error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch upcoming appointments",
    });
  }
};
const cancelAppointment = async (req, res) => {
  try {
    const { organizationId, appointmentId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Patient can cancel only their own appointment
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

      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          organizationId,
          patientId: patient.id,
        },
      });

      if (!appointment) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this appointment",
        });
      }
    } else {
      // Staff must belong to this organization
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

    const appointment = await appointmentService.cancelAppointment({
      organizationId,
      appointmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to cancel appointment",
    });
  }
};
const getAppointmentById = async (req, res) => {
  try {
    const { organizationId, appointmentId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Patient can access only their own appointment
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

      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          organizationId,
          patientId: patient.id,
        },
      });

      if (!appointment) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this appointment",
        });
      }
    } else {
      // Staff must belong to this organization
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

    const appointment = await appointmentService.getAppointmentById({
      organizationId,
      appointmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Appointment fetched successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Get appointment error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to fetch appointment",
    });
  }
};
const getPatientAppointmentHistory = async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Only patients can access their own appointment history
    if (req.user.role !== "PATIENT") {
      return res.status(403).json({
        success: false,
        message: "Only patients can access this resource",
      });
    }

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

    // Verify patient belongs to this organization
    const patientOrganization = await prisma.patientOrganization.findUnique({
      where: {
        patientId_organizationId: {
          patientId: patient.id,
          organizationId,
        },
      },
    });

    if (!patientOrganization) {
      return res.status(403).json({
        success: false,
        message: "You do not belong to this organization",
      });
    }

    const appointments = await appointmentService.getPatientAppointmentHistory({
      organizationId,
      patientId: patient.id,
    });

    return res.status(200).json({
      success: true,
      message: "Appointment history fetched successfully",
      data: appointments,
    });
  } catch (error) {
    console.error("Get appointment history error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch appointment history",
    });
  }
};
const getOrganizationAppointments = async (req, res) => {
  try {
    const { organizationId } = req.params;

    const { appointmentDate, doctorId, status, patientId } = req.query;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Patients cannot access organization-wide appointments
    if (req.user.role === "PATIENT") {
      return res.status(403).json({
        success: false,
        message: "Patients cannot access organization appointments",
      });
    }

    // Verify active organization membership
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

    if (!appointmentDate) {
      return res.status(400).json({
        success: false,
        message: "Appointment date is required",
      });
    }

    const appointments = await appointmentService.getOrganizationAppointments({
      organizationId,
      appointmentDate,
      doctorId,
      status,
      patientId,
    });

    return res.status(200).json({
      success: true,
      message: "Organization appointments fetched successfully",
      data: appointments,
    });
  } catch (error) {
    console.error("Get organization appointments error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch organization appointments",
    });
  }
};
const markAppointmentNoShow = async (req, res) => {
  try {
    const { organizationId, appointmentId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Patients cannot mark appointments as no-show
    if (req.user.role === "PATIENT") {
      return res.status(403).json({
        success: false,
        message: "Patients cannot mark appointments as no-show",
      });
    }

    // Verify active organization membership
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

    // Only appropriate staff roles can mark no-show
    const allowedRoles = ["ADMIN", "MANAGER", "RECEPTIONIST", "NURSE"];

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to mark appointments as no-show",
      });
    }

    const appointment = await appointmentService.markAppointmentNoShow({
      organizationId,
      appointmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Appointment marked as no-show successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Mark appointment no-show error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to mark appointment as no-show",
    });
  }
};
const getDoctorAppointments = async (req, res) => {
  try {
    const { organizationId, doctorId } = req.params;
    const { appointmentDate } = req.query;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Only doctors can access this endpoint
    if (req.user.role !== "DOCTOR") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can access this resource",
      });
    }

    // Get the doctor linked to the logged-in user
    const doctor = await prisma.doctor.findFirst({
      where: {
        id: doctorId,
        userId: req.user.userId,
        organizationId,
        status: "ACTIVE",
      },
    });

    if (!doctor) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this doctor's appointments",
      });
    }

    if (!appointmentDate) {
      return res.status(400).json({
        success: false,
        message: "Appointment date is required",
      });
    }

    const appointments = await appointmentService.getDoctorAppointments({
      organizationId,
      doctorId,
      appointmentDate,
    });

    return res.status(200).json({
      success: true,
      message: "Doctor appointments fetched successfully",
      data: appointments,
    });
  } catch (error) {
    console.error("Get doctor appointments error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch doctor appointments",
    });
  }
};
module.exports = {
  createAppointment,
  confirmAppointment,
  getPatientUpcomingAppointments,
  cancelAppointment,
  getAppointmentById,
  getPatientAppointmentHistory,
  getOrganizationAppointments,
  markAppointmentNoShow,
  getDoctorAppointments,
};
