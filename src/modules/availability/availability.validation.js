const { z } = require("zod");

const availabilityParamsSchema = z
  .object({
    organizationId: z.string().uuid("Invalid organization ID format"),
    doctorId: z.string().uuid("Invalid doctor ID format").optional(),
  })
  .strict();

const getAvailabilityQuerySchema = z
  .object({
    date: z.coerce.date({
      errorMap: () => ({ message: "Valid date is required" }),
    }),
  })
  .strict();

const listAvailableDoctorsQuerySchema = z
  .object({
    date: z.coerce.date({
      errorMap: () => ({ message: "Valid date is required" }),
    }),
    departmentId: z.string().uuid("Invalid department ID format").optional(),
    search: z.string().optional(),
    availableOnly: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .transform((v) => v === true || v === "true")
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

module.exports = {
  availabilityParamsSchema,
  getAvailabilityQuerySchema,
  listAvailableDoctorsQuerySchema,
  getAvailabilitySchema: getAvailabilityQuerySchema, // Backward compatibility
};
