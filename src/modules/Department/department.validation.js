const { z } = require("zod");

const createDepartmentSchema = z
  .object({
    name: z
      .string({ required_error: "Department name is required" })
      .trim()
      .min(2, "Department name must be at least 2 characters")
      .max(100, "Department name cannot exceed 100 characters"),

    status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
  })
  .strict();

const updateDepartmentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Department name must be at least 2 characters")
      .max(100, "Department name cannot exceed 100 characters")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

const updateDepartmentStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE"], {
      required_error: "Status is required",
      invalid_type_error: "Status must be either ACTIVE or INACTIVE",
    }),
  })
  .strict();

const listDepartmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();

const departmentParamsSchema = z
  .object({
    organizationId: z.string().uuid("Invalid organization ID format"),
    departmentId: z.string().uuid("Invalid department ID format").optional(),
  })
  .strict();

module.exports = {
  createDepartmentSchema,
  updateDepartmentSchema,
  updateDepartmentStatusSchema,
  listDepartmentsQuerySchema,
  departmentParamsSchema,
};
