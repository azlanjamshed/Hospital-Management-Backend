const express = require("express");
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
} = require("./organization-staff.validation");
const authentication = require("../../middleware/auth");
const requireOrganizationRole = require("../../middleware/organization");
const validate = require("../../middleware/validate");
const router = express.Router();

router.post(
  "/:organizationId/doctors",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(createDoctorSchema),
  createDoctor,
);
router.get(
  "/:organizationId/doctors",
  authentication,
  requireOrganizationRole("ADMIN"),
  getDoctors,
);
router.get(
  "/:organizationId/doctors/:doctorId",
  authentication,
  requireOrganizationRole("ADMIN"),
  getDoctorById,
);
router.patch(
  "/:organizationId/doctors/:doctorId",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(updateDoctorSchema),
  updateDoctor,
);

router.patch(
  "/:organizationId/doctors/:doctorId/status",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(updateDoctorStatusSchema),
  updateDoctorStatus,
);
router.patch(
  "/:organizationId/doctors/:doctorId/departments",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(updateDoctorDepartmentsSchema),
  updateDoctorDepartments,
);

router.post(
  "/:organizationId/staff",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(createStaffSchema),
  createStaff,
);
router.get(
  "/:organizationId/staff",
  authentication,
  requireOrganizationRole("ADMIN"),
  getStaff,
);

router.get(
  "/:organizationId/staff/:staffId",
  authentication,
  requireOrganizationRole("ADMIN"),
  getStaffById,
);

router.patch(
  "/:organizationId/staff/:staffId",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(updateStaffSchema),
  updateStaff,
);
router.patch(
  "/:organizationId/staff/:staffId/status",
  authentication,
  requireOrganizationRole("ADMIN"),
  validate(updateStaffStatusSchema),
  updateStaffStatus,
);
module.exports = router;
