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

const organizationAppointmentsQuerySchema = z.object({
  appointmentDate: z.coerce.date({
    error: "Valid appointment date is required",
  }),

  doctorId: z.string().uuid("Invalid doctor ID").optional(),

  patientId: z.string().uuid("Invalid patient ID").optional(),

  status: z
    .enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"])
    .optional(),
});
module.exports = {
  createAppointmentSchema,
  organizationAppointmentsQuerySchema,
};
