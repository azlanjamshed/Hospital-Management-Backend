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

module.exports = {
  createOrganization,
};
