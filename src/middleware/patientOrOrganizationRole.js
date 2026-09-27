const prisma = require("../config/prisma");

const patientOrOrganizationRole = (...allowedRoles) => {
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

      const patientId = req.params.patientId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: "Patient ID is required",
        });
      }

      // ------------------------------------------------
      // 1. Check if logged-in user is the patient
      // ------------------------------------------------

      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          userId: req.user.userId,
        },
      });

      if (patient) {
        const patientOrganization = await prisma.patientOrganization.findUnique(
          {
            where: {
              patientId_organizationId: {
                patientId,
                organizationId,
              },
            },
          },
        );

        if (!patientOrganization) {
          return res.status(403).json({
            success: false,
            message: "Patient does not belong to this organization",
          });
        }

        req.organization = {
          id: organizationId,
          type: "PATIENT",
        };

        req.patient = {
          id: patient.id,
        };

        return next();
      }

      // ------------------------------------------------
      // 2. Otherwise check organization staff
      // ------------------------------------------------

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

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient organization permissions",
        });
      }

      // Verify patient belongs to this organization
      const patientOrganization = await prisma.patientOrganization.findUnique({
        where: {
          patientId_organizationId: {
            patientId,
            organizationId,
          },
        },
      });

      if (!patientOrganization) {
        return res.status(404).json({
          success: false,
          message: "Patient does not belong to this organization",
        });
      }

      req.organization = {
        id: organizationId,
        membershipId: membership.id,
        role: membership.role,
        type: "STAFF",
      };

      req.patient = {
        id: patientId,
      };

      next();
    } catch (error) {
      console.error("Patient/organization authorization error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to verify patient access",
      });
    }
  };
};

module.exports = patientOrOrganizationRole;
