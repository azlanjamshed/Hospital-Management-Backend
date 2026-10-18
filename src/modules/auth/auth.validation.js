const { z } = require("zod");

/**
 * Documented Password Policy:
 * - Must be at least 8 characters long.
 * - Must not exceed 128 characters (prevents bcrypt hashing Denial-of-Service).
 */
const passwordPolicy = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password must not exceed 128 characters");

/**
 * Registration Schema
 * Requires either email OR phone (or both).
 */
const registerSchema = z
  .object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must not exceed 100 characters"),

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
      .max(20, "Phone number must not exceed 20 characters")
      .optional(),

    password: passwordPolicy,

    dateOfBirth: z.coerce.date().optional(),

    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  })
  .strict()
  .refine((data) => Boolean(data.email || data.phone), {
    message: "At least one contact identifier (email or phone) is required for registration",
    path: ["email"],
  });

/**
 * Login Schema
 * Accepts { identifier, password } or legacy { email, password } / { phone, password }.
 */
const loginSchema = z
  .object({
    identifier: z.string().trim().optional(),
    email: z.string().trim().toLowerCase().optional(),
    phone: z.string().trim().optional(),
    password: z.string().min(1, "Password is required"),
  })
  .strict()
  .refine((data) => Boolean(data.identifier || data.email || data.phone), {
    message: "An identifier (email or phone) is required to login",
    path: ["identifier"],
  });

/**
 * Profile Update Schema
 * Only permits updating name, email, phone, dateOfBirth, gender.
 * Rejects unknown or disallowed fields via strict().
 */
const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must not exceed 100 characters")
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
      .max(20, "Phone number must not exceed 20 characters")
      .optional(),

    dateOfBirth: z.coerce.date().optional(),

    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one profile field must be provided for update",
  });

/**
 * Change Password Schema
 * Requires current password verification and a new password conforming to policy.
 */
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordPolicy,
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

/**
 * Forgot Password Schema
 * Accepts identifier, email, or phone.
 */
const forgotPasswordSchema = z
  .object({
    identifier: z.string().trim().optional(),
    email: z.string().trim().toLowerCase().optional(),
    phone: z.string().trim().optional(),
  })
  .strict()
  .refine((data) => Boolean(data.identifier || data.email || data.phone), {
    message: "An identifier (email or phone) is required",
    path: ["identifier"],
  });

/**
 * Reset Password Schema
 * Requires token and new password.
 */
const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Reset token is required"),
    newPassword: passwordPolicy,
  })
  .strict();

module.exports = {
  passwordPolicy,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
