const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),

  email: z.string().trim().email("Invalid email").optional(),

  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 characters")
    .optional(),

  password: z.string().min(8, "Password must be at least 8 characters"),

  dateOfBirth: z.coerce.date().optional(),

  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email"),

  password: z.string().min(1, "Password is required"),
});

module.exports = {
  registerSchema,
  loginSchema,
};
