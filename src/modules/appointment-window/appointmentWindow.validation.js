const { z } = require("zod");

const createAppointmentWindowSchema = z
  .object({
    date: z.coerce.date({
      error: "Valid date is required",
    }),

    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:mm format")
      .nullable()
      .optional(),

    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:mm format")
      .nullable()
      .optional(),

    capacity: z.number().int().positive().optional(),

    status: z.enum(["OPEN", "CLOSED", "FULL"]).default("OPEN"),
  })
  .refine(
    (data) => {
      if (!data.startTime || !data.endTime) {
        return true;
      }

      return data.startTime < data.endTime;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

const updateAppointmentWindowSchema = z
  .object({
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
  })
  .refine(
    (data) => {
      if (!data.startTime || !data.endTime) {
        return true;
      }

      return data.startTime < data.endTime;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

module.exports = {
  createAppointmentWindowSchema,
  updateAppointmentWindowSchema,
};
