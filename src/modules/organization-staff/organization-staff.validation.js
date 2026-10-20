const { z } = require("zod");

const createDoctorSchema = z
  .object({
    name: z
      .string({ required_error: "Doctor name is required" })
      .trim()
      .min(2, "Doctor name must be at least 2 characters")
      .max(100, "Doctor name cannot exceed 100 characters"),

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

    qualification: z.string().trim().max(100).optional(),

    registrationNumber: z.string().trim().max(100).optional(),

    consultationFeeMinor: z
      .number()
      .int()
      .nonnegative("Consultation fee cannot be negative")
      .optional(),

    departmentIds: z
      .array(z.string().uuid("Invalid department ID"))
      .optional()
      .default([]),
  })
  .strict();

const updateDoctorSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Doctor name must be at least 2 characters")
      .max(100, "Doctor name cannot exceed 100 characters")
      .optional(),

    phone: z
      .string()
      .trim()
      .min(10, "Phone number must be at least 10 characters")
      .max(20, "Phone number cannot exceed 20 characters")
      .optional(),

    qualification: z.string().trim().max(100).optional(),

    registrationNumber: z.string().trim().max(100).optional(),

    consultationFeeMinor: z
      .number()
      .int()
      .nonnegative("Consultation fee cannot be negative")
      .optional(),

    departmentIds: z
      .array(z.string().uuid("Invalid department ID"))
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

const updateDoctorStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
  .strict();

const updateDoctorDepartmentsSchema = z
  .object({
    departmentIds: z
      .array(z.string().uuid("Invalid department ID"))
      .default([]),
  })
  .strict();

const createStaffSchema = z
  .object({
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

    role: z.enum(["ADMIN", "MANAGER", "RECEPTIONIST", "NURSE"]),
  })
  .strict();

const updateStaffSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .optional(),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .optional(),

    phone: z
      .string()
      .trim()
      .min(10, "Phone number must be at least 10 characters")
      .max(20, "Phone number cannot exceed 20 characters")
      .optional(),

    role: z.enum(["ADMIN", "MANAGER", "RECEPTIONIST", "NURSE"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

const updateStaffStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE"]),
  })
  .strict();

const listStaffQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    role: z.enum(["ADMIN", "MANAGER", "RECEPTIONIST", "NURSE"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();

const listDoctorsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    departmentId: z.string().uuid("Invalid department ID").optional(),
  })
  .strict();

const organizationStaffParamsSchema = z
  .object({
    organizationId: z.string().uuid("Invalid organization ID format"),
    staffId: z.string().uuid("Invalid staff ID format").optional(),
    doctorId: z.string().uuid("Invalid doctor ID format").optional(),
  })
  .strict();

module.exports = {
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
};
