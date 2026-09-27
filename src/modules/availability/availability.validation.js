const { z } = require("zod");

const getAvailabilitySchema = z.object({
  date: z.coerce.date({
    error: "Valid date is required",
  }),
});

module.exports = {
  getAvailabilitySchema,
};
