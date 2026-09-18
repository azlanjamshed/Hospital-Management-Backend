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
const updateDoctorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Doctor name must be at least 2 characters")
    .optional(),

  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 characters")
    .optional(),

  qualification: z.string().trim().optional(),

  registrationNumber: z.string().trim().optional(),

  consultationFeeMinor: z
    .number()
    .int()
    .nonnegative("Consultation fee cannot be negative")
    .optional(),

  departmentIds: z.array(z.string().uuid("Invalid department ID")).optional(),
});

const updateDoctorStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
const updateDoctorDepartmentsSchema = z.object({
  departmentIds: z.array(z.string().uuid("Invalid department ID")).default([]),
});
const createStaffSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),

  email: z.string().trim().email("Invalid email"),

  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 characters")
    .optional(),

  password: z.string().min(8, "Password must be at least 8 characters"),

  role: z.enum(["MANAGER", "RECEPTIONIST", "NURSE"]),
});

const updateStaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .optional(),

  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 characters")
    .optional(),

  role: z.enum(["MANAGER", "RECEPTIONIST", "NURSE"]).optional(),
});

const updateStaffStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
module.exports = {
  createDoctorSchema,
  updateDoctorSchema,
  updateDoctorStatusSchema,
  updateDoctorDepartmentsSchema,
  
  createStaffSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
};
