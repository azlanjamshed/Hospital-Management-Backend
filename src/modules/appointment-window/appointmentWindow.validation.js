const { z } = require("zod");

const createAppointmentWindowSchema = z
  .object({
    date: z.coerce.date({
      errorMap: () => ({ message: "Valid date is required" }),
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

    capacity: z
      .number()
      .int("Capacity must be an integer")
      .positive("Capacity must be a positive integer")
      .optional(),

    status: z.enum(["OPEN", "CLOSED", "FULL"]).default("OPEN"),
  })
  .strict()
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
      .nullable()
      .optional(),

    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:mm format")
      .nullable()
      .optional(),

    capacity: z
      .number()
      .int("Capacity must be an integer")
      .positive("Capacity must be a positive integer")
      .optional(),

    status: z.enum(["OPEN", "CLOSED", "FULL"]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
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

const updateAppointmentWindowStatusSchema = z
  .object({
    status: z.enum(["OPEN", "CLOSED", "FULL"], {
      required_error: "Status is required",
      invalid_type_error: "Status must be OPEN, CLOSED, or FULL",
    }),
  })
  .strict();

const listAppointmentWindowsQuerySchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["OPEN", "CLOSED", "FULL"]).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const appointmentWindowParamsSchema = z
  .object({
    organizationId: z.string().uuid("Invalid organization ID format"),
    doctorId: z.string().uuid("Invalid doctor ID format"),
    windowId: z.string().uuid("Invalid window ID format").optional(),
  })
  .strict();

module.exports = {
  createAppointmentWindowSchema,
  updateAppointmentWindowSchema,
  updateAppointmentWindowStatusSchema,
  listAppointmentWindowsQuerySchema,
  appointmentWindowParamsSchema,
};
