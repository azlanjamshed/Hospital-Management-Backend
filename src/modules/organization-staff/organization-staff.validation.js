const { z } = require("zod");

const createDoctorSchema = z.object({
  name: z.string().trim().min(2, "Doctor name must be at least 2 characters"),

  email: z.string().trim().email("Invalid email"),

  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 characters")
    .optional(),

  password: z.string().min(8, "Password must be at least 8 characters"),

  qualification: z.string().trim().optional(),

  registrationNumber: z.string().trim().optional(),

  consultationFeeMinor: z
    .number()
    .int()
    .nonnegative("Consultation fee cannot be negative")
    .optional(),

  departmentIds: z
    .array(z.string().uuid("Invalid department ID"))
    .optional()
    .default([]),
});

module.exports = {
  createDoctorSchema,
};
