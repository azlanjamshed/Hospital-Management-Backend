const prisma = require("../config/prisma");

const requireOrganizationRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      console.log("➡️ requireOrganization reached");
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const organizationId =
        req.params.organizationId ||
        req.body.organizationId ||
        req.query.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      if (req.user.role === "SUPER_ADMIN") {
        req.organization = {
          id: organizationId,
          role: "SUPER_ADMIN",
        };
        return next();
      }

      if (allowedRoles.includes("DOCTOR") && req.user.role === "DOCTOR") {
        const doctor = await prisma.doctor.findFirst({
          where: {
            organizationId,
            userId: req.user.userId,
            status: "ACTIVE",
          },
        });

        if (!doctor) {
          return res.status(403).json({
            success: false,
            message: "Doctor does not belong to this organization or is inactive",
          });
        }

        if (req.params.doctorId && req.params.doctorId !== doctor.id) {
          return res.status(403).json({
            success: false,
            message: "You can only manage your own resources",
          });
        }

        req.organization = {
          id: organizationId,
          role: "DOCTOR",
        };
        req.doctor = doctor;

        return next();
      }

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

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient organization permissions",
        });
      }

      req.organization = {
        id: organizationId,
        membershipId: membership.id,
        role: membership.role,
      };

      next();
    } catch (error) {
      console.error("Organization authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to verify organization access",
      });
    }
  };
};

module.exports = requireOrganizationRole;
