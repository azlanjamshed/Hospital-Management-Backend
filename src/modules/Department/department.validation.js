const { z } = require("zod");

const createDepartmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Department name must be at least 2 characters"),
});

const updateDepartmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Department name must be at least 2 characters")
    .optional(),
});

const updateDepartmentStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

module.exports = {
  createDepartmentSchema,
  updateDepartmentSchema,
  updateDepartmentStatusSchema,
};
