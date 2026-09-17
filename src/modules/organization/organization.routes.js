const express = require("express");
const router = express.Router();
const validation = require("../../middleware/validate");
const authentication = require("../../middleware/auth");
const role = require("../../middleware/roles");
const {
  createOrganization,
  createOrganizationAdmin,
} = require("./organization.controller");
const {
  createOrganizationSchema,
  createOrganizationAdminSchema,
} = require("./organization.validation");
const requireOrganizationRole = require("../../middleware/organization");

router.post(
  "/",
  authentication,
  role("SUPER_ADMIN"),
  validation(createOrganizationSchema),
  createOrganization,
);
router.post(
  "/admin",
  authentication,
  role("SUPER_ADMIN"),
  validation(createOrganizationAdminSchema),
  createOrganizationAdmin,
);
router.get(
  "/:organizationId/admin-test",
  authentication,
  requireOrganizationRole("ADMIN"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Organization admin access granted",
      organization: req.organization,
    });
  },
);

module.exports = router;
