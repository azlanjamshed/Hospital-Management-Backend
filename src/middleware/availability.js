const prisma = require("../config/prisma");

/**
 * Authorization middleware for doctor availability endpoints.
 * - Allows SUPER_ADMIN for any organization.
 * - Allows PATIENT to discover availability without pre-existing PatientOrganization link.
 * - Allows active STAFF (ADMIN, MANAGER, NURSE, RECEPTIONIST) of the requested organization.
 * - Allows active DOCTOR of the requested organization (restricted to own ID if doctorId specified).
 * - Enforces tenant isolation and validates organization and doctor existence.
 */
const requireAvailabilityAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { organizationId, doctorId } = req.params;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    // 1. Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, status: true },
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // 2. If doctorId is specified in URL params, verify doctor belongs to this organization
    if (doctorId) {
      const doctor = await prisma.doctor.findFirst({
        where: {
          id: doctorId,
          organizationId,
        },
        select: {
          id: true,
          userId: true,
          status: true,
        },
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found in this organization",
        });
      }
    }

    // 3. SUPER ADMIN
    if (req.user.role === "SUPER_ADMIN") {
      req.organization = { id: organizationId };
      return next();
    }

    // 4. PATIENT - patients are allowed to discover availability without requiring pre-existing membership
    if (req.user.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.userId },
        select: { id: true },
      });

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient profile not found",
        });
      }

      req.organization = { id: organizationId };
      return next();
    }

    // 5. STAFF - must have active membership in this organization
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
          role: true,
          status: true,
        },
      });

      if (!membership || membership.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: "You do not belong to this organization",
        });
      }

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

    // 6. DOCTOR - must belong to this organization, and if checking a specific doctor, can only check own availability
    if (req.user.role === "DOCTOR") {
      const doctorUser = await prisma.doctor.findFirst({
        where: {
          organizationId,
          userId: req.user.userId,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!doctorUser) {
        return res.status(403).json({
          success: false,
          message: "Doctor does not belong to this organization or is inactive",
        });
      }

      if (doctorId && doctorId !== doctorUser.id) {
        return res.status(403).json({
          success: false,
          message: "You can only access your own availability",
        });
      }

      req.organization = { id: organizationId };
      req.doctor = doctorUser;
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
