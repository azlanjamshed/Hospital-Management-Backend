const { z } = require("zod");

const createScheduleSchema = z
  .object({
    weekday: z
      .number({ required_error: "Weekday is required" })
      .int("Weekday must be an integer")
      .min(0, "Weekday must be between 0 (Sunday) and 6 (Saturday)")
      .max(6, "Weekday must be between 0 (Sunday) and 6 (Saturday)"),

    startTime: z
      .string({ required_error: "Start time is required" })
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:mm format"),

    endTime: z
      .string({ required_error: "End time is required" })
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:mm format"),
  })
  .strict()
  .refine((data) => data.startTime < data.endTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

const updateScheduleSchema = z
  .object({
    weekday: z
      .number()
      .int("Weekday must be an integer")
      .min(0, "Weekday must be between 0 (Sunday) and 6 (Saturday)")
      .max(6, "Weekday must be between 0 (Sunday) and 6 (Saturday)")
      .optional(),

    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:mm format")
      .optional(),

    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:mm format")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

const listSchedulesQuerySchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const scheduleParamsSchema = z
  .object({
    organizationId: z.string().uuid("Invalid organization ID format"),
    doctorId: z.string().uuid("Invalid doctor ID format"),
    scheduleId: z.string().uuid("Invalid schedule ID format").optional(),
  })
  .strict();

module.exports = {
  createScheduleSchema,
  updateScheduleSchema,
  listSchedulesQuerySchema,
  scheduleParamsSchema,
};
