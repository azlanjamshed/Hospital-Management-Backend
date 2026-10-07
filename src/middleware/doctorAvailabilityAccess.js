const prisma = require("../config/prisma");

const doctorAvailabilityAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { organizationId, doctorId } = req.params;

    // Super admin can access any organization
    if (req.user.role === "SUPER_ADMIN") {
      return next();
    }

    // Verify doctor belongs to requested organization
    const doctor = await prisma.doctor.findFirst({
      where: {
        id: doctorId,
        organizationId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        organizationId: true,
        userId: true,
      },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Doctor can check availability only for themselves
    if (req.user.role === "DOCTOR") {
      if (doctor.userId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own availability",
        });
      }

      return next();
    }

    // Patient must belong to this organization
    if (req.user.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({
        where: {
          userId: req.user.userId,
        },
        select: {
          id: true,
        },
      });

      if (!patient) {
        return res.status(403).json({
          success: false,
          message: "Patient profile not found",
        });
      }

      const patientOrganization = await prisma.patientOrganization.findUnique({
        where: {
          patientId_organizationId: {
            patientId: patient.id,
            organizationId,
          },
        },
        select: {
          patientId: true,
        },
      });

      if (!patientOrganization) {
        return res.status(403).json({
          success: false,
          message: "You do not belong to this organization",
        });
      }

      return next();
    }

    // Staff must have active membership in this organization
    if (req.user.role === "STAFF") {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!membership || membership.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: "You do not belong to this organization",
        });
      }

      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You are not allowed to access doctor availability",
    });
  } catch (error) {
    console.error("Doctor availability access error:", error);

    return res.status(500).json({
      success: false,
      message: "Authorization check failed",
    });
  }
};

module.exports = doctorAvailabilityAccess;
