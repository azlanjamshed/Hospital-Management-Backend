const { z } = require("zod");

const updateConsultationSchema = z.object({
  chiefComplaint: z.string().trim().max(2000).nullable().optional(),
  diagnosis: z.string().trim().max(2000).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  doctorRemarks: z.string().trim().max(5000).nullable().optional(),
});

module.exports = {
  updateConsultationSchema,
};
