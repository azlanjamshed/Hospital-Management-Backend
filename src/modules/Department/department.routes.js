const express = require("express");
const router = express.Router();

const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const validate = require("../../middleware/validate");

const {
  createDepartment,
  getDepartments,
  getDepartmentById,
  getDepartmentDoctors,
  updateDepartment,
  updateDepartmentStatus,
} = require("./department.controller");

const {
  createDepartmentSchema,
  updateDepartmentSchema,
  updateDepartmentStatusSchema,
  listDepartmentsQuerySchema,
  departmentParamsSchema,
} = require("./department.validation");

// =========================================================================
// 1. SPECIFIC SUB-RESOURCE ROUTES (Legacy duplicated prefix first)
// =========================================================================

// Status update (legacy prefix)
router.patch(
  "/:organizationId/departments/:departmentId/status",
  authentication,
  validate(departmentParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(updateDepartmentStatusSchema),
  updateDepartmentStatus,
);

// Department doctors (legacy prefix)
router.get(
  "/:organizationId/departments/:departmentId/doctors",
  authentication,
  validate(departmentParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(listDepartmentsQuerySchema, "query"),
  getDepartmentDoctors,
);

// Single department GET / PATCH (legacy prefix)
router.get(
  "/:organizationId/departments/:departmentId",
  authentication,
  validate(departmentParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  getDepartmentById,
);

router.patch(
  "/:organizationId/departments/:departmentId",
  authentication,
  validate(departmentParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(updateDepartmentSchema),
  updateDepartment,
);

// Department collection GET / POST (legacy prefix)
router.post(
  "/:organizationId/departments",
  authentication,
  validate(departmentParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(createDepartmentSchema),
  createDepartment,
);

router.get(
  "/:organizationId/departments",
  authentication,
  validate(departmentParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(listDepartmentsQuerySchema, "query"),
  getDepartments,
);

// =========================================================================
// 2. CLEAN RESTFUL ROUTES (/api/departments/:organizationId/...)
// =========================================================================

// Status update (clean prefix)
router.patch(
  "/:organizationId/:departmentId/status",
  authentication,
  validate(departmentParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(updateDepartmentStatusSchema),
  updateDepartmentStatus,
);

// Department doctors (clean prefix)
router.get(
  "/:organizationId/:departmentId/doctors",
  authentication,
  validate(departmentParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(listDepartmentsQuerySchema, "query"),
  getDepartmentDoctors,
);

// Single department GET / PATCH (clean prefix)
router.get(
  "/:organizationId/:departmentId",
  authentication,
  validate(departmentParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  getDepartmentById,
);

router.patch(
  "/:organizationId/:departmentId",
  authentication,
  validate(departmentParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(updateDepartmentSchema),
  updateDepartment,
);

// Department collection GET / POST (clean prefix)
router.post(
  "/:organizationId",
  authentication,
  validate(departmentParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(createDepartmentSchema),
  createDepartment,
);

router.get(
  "/:organizationId",
  authentication,
  validate(departmentParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(listDepartmentsQuerySchema, "query"),
  getDepartments,
);

module.exports = router;
