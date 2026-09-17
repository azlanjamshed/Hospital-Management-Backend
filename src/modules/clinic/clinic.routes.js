const express = require("express");

const clinicController = require("./clinic.controller");
const validate = require("../../middleware/validate");
const {
  createClinicSchema,
  updateClinicSchema,
  clinicIdSchema,
} = require("./clinic.validation");

const router = express.Router();

router.post("/", validate(createClinicSchema), clinicController.createClinic);

router.get("/", clinicController.getClinics);

router.get(
  "/:id",
  validate(clinicIdSchema, "params"),
  clinicController.getClinicById,
);

router.put(
  "/:id",
  validate(clinicIdSchema, "params"),
  clinicController.updateClinic,
);

router.delete(
  "/:id",
  validate(clinicIdSchema, "params"),
  clinicController.deleteClinic,
);

module.exports = router;
