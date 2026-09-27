const prisma = require("../config/prisma");

const requireAvailabilityAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { organizationId, doctorId } = req.params;

    if (!organizationId || !doctorId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID and doctor ID are required",
      });
    }

    // First: doctor must belong to the requested organization
    const doctor = await prisma.doctor.findFirst({
      where: {
        id: doctorId,
        organizationId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found in this organization",
      });
    }

    // SUPER ADMIN
    if (req.user.role === "SUPER_ADMIN") {
      req.organization = {
        id: organizationId,
      };

      return next();
    }

    // PATIENT
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
        return res.status(404).json({
          success: false,
          message: "Patient profile not found",
        });
      }

      req.organization = {
        id: organizationId,
      };

      return next();
    }

    // STAFF
    if (req.user.role === "STAFF") {
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
          message: "You do not belong to this organization",
        });
      }

      // Only these staff roles can view availability
      const allowedStaffRoles = ["ADMIN", "MANAGER", "NURSE", "RECEPTIONIST"];

      if (!allowedStaffRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to doctor availability",
        });
      }

      req.organization = {
        id: organizationId,
        membershipId: membership.id,
        role: membership.role,
      };

      return next();
    }

    // DOCTOR
    if (req.user.role === "DOCTOR") {
      const doctorUser = await prisma.doctor.findFirst({
        where: {
          id: doctorId,
          organizationId,
          userId: req.user.userId,
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

      if (!doctorUser) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this doctor",
        });
      }

      req.organization = {
        id: organizationId,
      };

      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  } catch (error) {
    console.error("Availability authorization error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify availability access",
    });
  }
};

module.exports = requireAvailabilityAccess;
