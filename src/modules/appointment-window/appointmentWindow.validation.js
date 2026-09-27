const { z } = require("zod");

const createAppointmentWindowSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor ID").optional(),

  date: z.coerce.date({
    error: "Valid date is required",
  }),

  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:mm format")
    .optional(),

  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:mm format")
    .optional(),

  capacity: z.number().int().positive().optional(),

  status: z.enum(["OPEN", "CLOSED", "FULL"]).default("OPEN"),
});

const updateAppointmentWindowSchema = z.object({
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:mm format")
    .optional(),

  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:mm format")
    .optional(),

  capacity: z.number().int().positive().optional(),

  status: z.enum(["OPEN", "CLOSED", "FULL"]).optional(),
});

module.exports = {
  createAppointmentWindowSchema,
  updateAppointmentWindowSchema,
};
