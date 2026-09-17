const { z } = require("zod");

const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters"),

  type: z
    .enum(["HOSPITAL", "CLINIC", "DIAGNOSTIC_CENTER", "MEDICAL_CENTER"])
    .default("HOSPITAL"),

  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required")
    .default("Asia/Kolkata"),

  address: z.string().trim().optional(),

  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 characters")
    .optional(),

  email: z.string().trim().email("Invalid email").optional(),
});

module.exports = {
  createOrganizationSchema,
};
