const organizationService = require("./organization.service");

/**
 * POST /api/organization
 */
const createOrganization = async (req, res) => {
  try {
    const organization = await organizationService.createOrganization(req.body);

    return res.status(201).json({
      success: true,
      message: "Organization created successfully",
      data: organization,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Create organization error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to create organization",
    });
  }
};

/**
 * POST /api/organization/admin
 */
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
    if (!error.statusCode) console.error("Create organization admin error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to create organization admin",
    });
  }
};

/**
 * GET /api/organization
 */
const listOrganizations = async (req, res) => {
  try {
    const result = await organizationService.listOrganizations(req.query);

    return res.status(200).json({
      success: true,
      data: result.organizations,
      pagination: result.pagination,
    });
  } catch (error) {
    if (!error.statusCode) console.error("List organizations error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to list organizations",
    });
  }
};

/**
 * GET /api/organization/:organizationId
 */
const getOrganizationById = async (req, res) => {
  try {
    const organization = await organizationService.getOrganizationById(
      req.params.organizationId,
    );

    return res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Get organization error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch organization",
    });
  }
};

/**
 * PATCH /api/organization/:organizationId
 */
const updateOrganization = async (req, res) => {
  try {
    const updated = await organizationService.updateOrganization(
      req.params.organizationId,
      req.body,
      req.user.role,
    );

    return res.status(200).json({
      success: true,
      message: "Organization updated successfully",
      data: updated,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Update organization error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to update organization",
    });
  }
};

/**
 * GET /api/organization/:organizationId/settings
 */
const getOrganizationSettings = async (req, res) => {
  try {
    const settings = await organizationService.getOrganizationSettings(
      req.params.organizationId,
    );

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Get organization settings error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch organization settings",
    });
  }
};

/**
 * PATCH /api/organization/:organizationId/settings
 */
const updateOrganizationSettings = async (req, res) => {
  try {
    const settings = await organizationService.updateOrganizationSettings(
      req.params.organizationId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Organization settings updated successfully",
      data: settings,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Update organization settings error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to update organization settings",
    });
  }
};

module.exports = {
  createOrganization,
  createOrganizationAdmin,
  listOrganizations,
  getOrganizationById,
  updateOrganization,
  getOrganizationSettings,
  updateOrganizationSettings,
};
