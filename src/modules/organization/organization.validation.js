const { z } = require("zod");

const createOrganizationSchema = z
  .object({
    name: z
      .string({ required_error: "Organization name is required" })
      .trim()
      .min(2, "Organization name must be at least 2 characters")
      .max(100, "Organization name cannot exceed 100 characters"),

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
      .max(20, "Phone number cannot exceed 20 characters")
      .optional(),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .optional(),
  })
  .strict();

const createOrganizationAdminSchema = z
  .object({
    organizationId: z.string().uuid("Invalid organization ID format"),

    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),

    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email address"),

    phone: z
      .string()
      .trim()
      .min(10, "Phone number must be at least 10 characters")
      .max(20, "Phone number cannot exceed 20 characters")
      .optional(),

    password: z
      .string({ required_error: "Password is required" })
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password cannot exceed 128 characters"),
  })
  .strict();

const organizationIdParamSchema = z
  .object({
    organizationId: z.string().uuid("Invalid organization ID format"),
  })
  .strict();

const listOrganizationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1, "Page must be greater than or equal to 1").default(1),
    limit: z.coerce.number().int().min(1).max(100, "Limit cannot exceed 100").default(10),
    search: z.string().trim().optional(),
    type: z
      .enum(["HOSPITAL", "CLINIC", "DIAGNOSTIC_CENTER", "MEDICAL_CENTER"])
      .optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  })
  .strict();

const updateOrganizationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Organization name must be at least 2 characters")
      .max(100, "Organization name cannot exceed 100 characters")
      .optional(),

    type: z
      .enum(["HOSPITAL", "CLINIC", "DIAGNOSTIC_CENTER", "MEDICAL_CENTER"])
      .optional(),

    timezone: z
      .string()
      .trim()
      .min(1, "Timezone cannot be empty")
      .optional(),

    address: z.string().trim().nullable().optional(),

    phone: z
      .string()
      .trim()
      .min(10, "Phone number must be at least 10 characters")
      .max(20, "Phone number cannot exceed 20 characters")
      .nullable()
      .optional(),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .nullable()
      .optional(),

    status: z
      .enum(["ACTIVE", "INACTIVE", "SUSPENDED"])
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

const updateOrganizationSettingsSchema = z
  .object({
    timezone: z
      .string({ required_error: "Timezone is required" })
      .trim()
      .min(1, "Timezone cannot be empty"),
  })
  .strict();

module.exports = {
  createOrganizationSchema,
  createOrganizationAdminSchema,
  organizationIdParamSchema,
  listOrganizationsQuerySchema,
  updateOrganizationSchema,
  updateOrganizationSettingsSchema,
};
