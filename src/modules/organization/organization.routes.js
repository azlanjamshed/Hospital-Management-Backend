const express = require("express");
const router = express.Router();

const validation = require("../../middleware/validate");
const authentication = require("../../middleware/auth");
const role = require("../../middleware/roles");
const requireOrganizationRole = require("../../middleware/organization");

const {
  createOrganization,
  createOrganizationAdmin,
  listOrganizations,
  getOrganizationById,
  updateOrganization,
  getOrganizationSettings,
  updateOrganizationSettings,
} = require("./organization.controller");

const {
  createOrganizationSchema,
  createOrganizationAdminSchema,
  organizationIdParamSchema,
  listOrganizationsQuerySchema,
  updateOrganizationSchema,
  updateOrganizationSettingsSchema,
} = require("./organization.validation");

// 1. Create Organization (Platform Super Admin only)
router.post(
  "/",
  authentication,
  role("SUPER_ADMIN"),
  validation(createOrganizationSchema),
  createOrganization,
);

// 2. Create Initial Organization Admin (Platform Super Admin only)
router.post(
  "/admin",
  authentication,
  role("SUPER_ADMIN"),
  validation(createOrganizationAdminSchema),
  createOrganizationAdmin,
);

// 3. List Organizations with pagination and filters (Platform Super Admin only)
router.get(
  "/",
  authentication,
  role("SUPER_ADMIN"),
  validation(listOrganizationsQuerySchema, "query"),
  listOrganizations,
);

// 4. Read Organization Settings (Super Admin, Organization Admin, Organization Manager)
router.get(
  "/:organizationId/settings",
  authentication,
  validation(organizationIdParamSchema, "params"),
  requireOrganizationRole("ADMIN", "MANAGER"),
  getOrganizationSettings,
);

// 5. Update Organization Settings (Super Admin, Organization Admin)
router.patch(
  "/:organizationId/settings",
  authentication,
  validation(organizationIdParamSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validation(updateOrganizationSettingsSchema),
  updateOrganizationSettings,
);

// 6. Get Organization by ID (Super Admin, or active staff/doctors of this organization)
router.get(
  "/:organizationId",
  authentication,
  validation(organizationIdParamSchema, "params"),
  requireOrganizationRole("ADMIN", "MANAGER", "RECEPTIONIST", "NURSE", "DOCTOR"),
  getOrganizationById,
);

// 7. Update Organization Profile (Super Admin, Organization Admin)
router.patch(
  "/:organizationId",
  authentication,
  validation(organizationIdParamSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validation(updateOrganizationSchema),
  updateOrganization,
);

module.exports = router;
