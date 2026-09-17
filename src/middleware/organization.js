const prisma = require("../config/prisma");

const requireOrganizationRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
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
