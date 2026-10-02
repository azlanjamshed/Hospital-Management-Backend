const { z } = require("zod");

const prescriptionItemSchema = z.object({
  medicineName: z
    .string()
    .trim()
    .min(1, "Medicine name is required")
    .max(200, "Medicine name is too long"),

  dosage: z
    .string()
    .trim()
    .max(200, "Dosage is too long")
    .nullable()
    .optional(),

  frequency: z
    .string()
    .trim()
    .max(200, "Frequency is too long")
    .nullable()
    .optional(),

  duration: z
    .string()
    .trim()
    .max(100, "Duration is too long")
    .nullable()
    .optional(),

  instructions: z
    .string()
    .trim()
    .max(1000, "Instructions are too long")
    .nullable()
    .optional(),
});

const createPrescriptionSchema = z.object({
  items: z
    .array(prescriptionItemSchema)
    .min(1, "At least one medicine is required")
    .max(50, "Maximum 50 medicines are allowed"),
});

module.exports = {
  prescriptionItemSchema,
  createPrescriptionSchema,
};
