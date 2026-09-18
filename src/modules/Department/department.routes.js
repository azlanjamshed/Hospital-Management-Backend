const express = require("express");
const router = express.Router();
const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const validate = require("../../middleware/validate");
const {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  updateDepartmentStatus,
} = require("./department.controller");
const {
  createDepartmentSchema,
  updateDepartmentSchema,
  updateDepartmentStatusSchema,
} = require("./department.validation");

router.post(
  "/:organizationId/departments",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(createDepartmentSchema),
  createDepartment,
);
router.get(
  "/:organizationId/departments",
  authentication,
  requireOrganizationRole("ADMIN"),
  getDepartments,
);
router.get(
  "/:organizationId/departments/:departmentId",
  authentication,
  requireOrganizationRole("ADMIN"),
  getDepartmentById,
);

router.patch(
  "/:organizationId/departments/:departmentId",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(updateDepartmentSchema),
  updateDepartment,
);

router.patch(
  "/:organizationId/departments/:departmentId/status",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(updateDepartmentStatusSchema),
  updateDepartmentStatus,
);

module.exports = router;
