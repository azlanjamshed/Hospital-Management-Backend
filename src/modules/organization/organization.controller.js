const organizationService = require("./organization.service");

const createOrganization = async (req, res) => {
  try {
    const organization = await organizationService.createOrganization(req.body);

    return res.status(201).json({
      success: true,
      message: "Organization created successfully",
      data: organization,
    });
  } catch (error) {
    console.error("Create organization error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to create organization",
    });
  }
};

const createOrganizationAdmin = async (req, res) => {
  try {
    const result = await organizationService.createOrganizationAdmin(req.body);

    return res.status(201).json({
      success: true,
      message: "Organization admin created successfully",
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
        },
        membership: {
          id: result.membership.id,
          organizationId: result.membership.organizationId,
          role: result.membership.role,
          status: result.membership.status,
        },
      },
    });
  } catch (error) {
    console.error("Create organization admin error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to create organization admin",
    });
  }
};
module.exports = {
  createOrganization,
  createOrganizationAdmin,
};
