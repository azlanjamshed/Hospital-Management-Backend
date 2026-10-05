const { z } = require("zod");

const doctorAvailabilityQuerySchema = z.object({
  date: z.coerce.date({
    error: "Valid date is required",
  }),
});

module.exports = {
  doctorAvailabilityQuerySchema,
};
