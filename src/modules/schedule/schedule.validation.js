const { z } = require("zod");

const createScheduleSchema = z.object({
  weekday: z
    .number()
    .int()
    .min(0, "Weekday must be between 0 and 6")
    .max(6, "Weekday must be between 0 and 6"),

  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:mm format"),

  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:mm format"),
});

const updateScheduleSchema = z.object({
  weekday: z
    .number()
    .int()
    .min(0, "Weekday must be between 0 and 6")
    .max(6, "Weekday must be between 0 and 6")
    .optional(),

  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:mm format")
    .optional(),

  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:mm format")
    .optional(),
});

module.exports = {
  createScheduleSchema,
  updateScheduleSchema,
};
