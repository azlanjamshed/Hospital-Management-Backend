const { z } = require("zod");

const createAppointmentSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID").optional(),

  doctorId: z.string().uuid("Invalid doctor ID"),

  appointmentDate: z.coerce.date({
    error: "Valid appointment date is required",
  }),

  paymentMethod: z.enum(["ONLINE", "PAY_AT_HOSPITAL"]),

  source: z.enum(["PATIENT_APP", "STAFF", "WHATSAPP"]).default("PATIENT_APP"),
});

module.exports = {
  createAppointmentSchema,
};
