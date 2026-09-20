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

  slotMinutes: z
    .number()
    .int()
    .min(5, "Slot duration must be at least 5 minutes")
    .max(240, "Slot duration cannot exceed 240 minutes")
    .default(30),
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

  slotMinutes: z
    .number()
    .int()
    .min(5, "Slot duration must be at least 5 minutes")
    .max(240, "Slot duration cannot exceed 240 minutes")
    .optional(),
});

module.exports = {
  createScheduleSchema,
  updateScheduleSchema,
};
