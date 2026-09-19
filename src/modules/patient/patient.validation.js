const { z } = require("zod");

const createPatientSchema = z.object({
  name: z.string().trim().min(2, "Patient name must be at least 2 characters"),

  email: z.string().trim().email("Invalid email").optional(),

  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 characters")
    .optional(),

  dateOfBirth: z.coerce.date().optional(),

  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

const updatePatientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Patient name must be at least 2 characters")
    .optional(),

  dateOfBirth: z.coerce.date().optional(),

  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

const searchPatientSchema = z
  .object({
    phone: z.string().trim().min(10).optional(),

    email: z.string().trim().email("Invalid email").optional(),

    hospitalPatientNumber: z.string().trim().min(1).optional(),

    name: z.string().trim().min(2).optional(),

    dateOfBirth: z.coerce.date().optional(),
  })
  .refine(
    (data) =>
      data.phone || data.email || data.hospitalPatientNumber || data.name,
    {
      message: "At least one search field is required",
    },
  );
module.exports = {
  createPatientSchema,
  updatePatientSchema,
  searchPatientSchema,
};
