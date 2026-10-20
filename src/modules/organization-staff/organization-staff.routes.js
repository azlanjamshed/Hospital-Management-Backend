const express = require("express");
const router = express.Router();

const {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  updateDoctorStatus,
  updateDoctorDepartments,
  createStaff,
  getStaff,
  getStaffById,
  updateStaff,
  updateStaffStatus,
} = require("./organization-staff.controller");

const {
  createDoctorSchema,
  updateDoctorSchema,
  updateDoctorStatusSchema,
  updateDoctorDepartmentsSchema,
  createStaffSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
  listStaffQuerySchema,
  listDoctorsQuerySchema,
  organizationStaffParamsSchema,
} = require("./organization-staff.validation");

const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const validate = require("../../middleware/validate");

// ==========================================
// DOCTORS MANAGEMENT (Scoped to Organization)
// ==========================================

router.post(
  "/:organizationId/doctors",
  authentication,
  validate(organizationStaffParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(createDoctorSchema),
  createDoctor,
);

router.get(
  "/:organizationId/doctors",
  authentication,
  validate(organizationStaffParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(listDoctorsQuerySchema, "query"),
  getDoctors,
);

router.get(
  "/:organizationId/doctors/:doctorId",
  authentication,
  validate(organizationStaffParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  getDoctorById,
);

router.patch(
  "/:organizationId/doctors/:doctorId",
  authentication,
  validate(organizationStaffParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(updateDoctorSchema),
  updateDoctor,
);

router.patch(
  "/:organizationId/doctors/:doctorId/status",
  authentication,
  validate(organizationStaffParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(updateDoctorStatusSchema),
  updateDoctorStatus,
);

router.patch(
  "/:organizationId/doctors/:doctorId/departments",
  authentication,
  validate(organizationStaffParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(updateDoctorDepartmentsSchema),
  updateDoctorDepartments,
);

// ==========================================
// STAFF MANAGEMENT (Scoped to Organization)
// ==========================================

router.post(
  "/:organizationId/staff",
  authentication,
  validate(organizationStaffParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(createStaffSchema),
  createStaff,
);

router.get(
  "/:organizationId/staff",
  authentication,
  validate(organizationStaffParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(listStaffQuerySchema, "query"),
  getStaff,
);

router.get(
  "/:organizationId/staff/:staffId",
  authentication,
  validate(organizationStaffParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  getStaffById,
);

router.patch(
  "/:organizationId/staff/:staffId",
  authentication,
  validate(organizationStaffParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(updateStaffSchema),
  updateStaff,
);

router.patch(
  "/:organizationId/staff/:staffId/status",
  authentication,
  validate(organizationStaffParamsSchema, "params"),
  requireOrganizationRole("ADMIN"),
  validate(updateStaffStatusSchema),
  updateStaffStatus,
);

module.exports = router;
