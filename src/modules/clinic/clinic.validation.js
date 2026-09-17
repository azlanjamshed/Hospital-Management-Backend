const { z } = require("zod");

const createClinicSchema = z.object({
  name: z.string().trim().min(2, "Clinic name must be at least 2 characters"),

  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required")
    .default("Asia/Kolkata"),

  address: z.string().trim().optional(),

  phone: z.string().trim().optional(),
});

const updateClinicSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Clinic name must be at least 2 characters")
      .optional(),

    timezone: z.string().trim().min(1, "Timezone cannot be empty").optional(),

    address: z.string().trim().optional(),

    phone: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required for update",
  });

const clinicIdSchema = z.object({
  id: z.uuid("Invalid clinic ID"),
});

module.exports = {
  createClinicSchema,
  updateClinicSchema,
  clinicIdSchema,
};
