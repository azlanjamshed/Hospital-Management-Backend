const prisma = require("../../config/prisma");

const createPrescription = async ({
  organizationId,
  consultationId,
  doctorId,
  items,
}) => {
  return prisma.$transaction(async (tx) => {
    // 1. Get consultation within the organization
    const consultation = await tx.consultation.findFirst({
      where: {
        id: consultationId,
        organizationId,
      },
      include: {
        prescription: true,
      },
    });

    if (!consultation) {
      const error = new Error("Consultation not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Only the assigned doctor can create the prescription
    if (consultation.doctorId !== doctorId) {
      const error = new Error(
        "You are not authorized to create a prescription for this consultation",
      );
      error.statusCode = 403;
      throw error;
    }

    // 3. A consultation can have only one prescription
    if (consultation.prescription) {
      const error = new Error(
        "A prescription already exists for this consultation",
      );
      error.statusCode = 409;
      throw error;
    }

    // 4. Create prescription + medicines atomically
    const prescription = await tx.prescription.create({
      data: {
        consultationId: consultation.id,
        patientId: consultation.patientId,
        doctorId: consultation.doctorId,
        organizationId: consultation.organizationId,

        items: {
          create: items.map((item) => ({
            medicineName: item.medicineName,
            dosage: item.dosage ?? null,
            frequency: item.frequency ?? null,
            duration: item.duration ?? null,
            instructions: item.instructions ?? null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return prescription;
  });
};
const getPrescription = async ({ organizationId, prescriptionId }) => {
  const prescription = await prisma.prescription.findFirst({
    where: {
      id: prescriptionId,
      organizationId,
    },
    include: {
      items: true,

      patient: {
        select: {
          id: true,
          name: true,
          dateOfBirth: true,
          gender: true,
        },
      },

      doctor: {
        select: {
          id: true,
          name: true,
          qualification: true,
          registrationNumber: true,
        },
      },

      consultation: {
        select: {
          id: true,
          chiefComplaint: true,
          diagnosis: true,
          notes: true,
          doctorRemarks: true,
          startedAt: true,
          completedAt: true,
        },
      },
    },
  });

  if (!prescription) {
    const error = new Error("Prescription not found");
    error.statusCode = 404;
    throw error;
  }

  return prescription;
};
const getPatientPrescription = async ({ prescriptionId, patientId }) => {
  const prescription = await prisma.prescription.findFirst({
    where: {
      id: prescriptionId,
      patientId,
    },
    include: {
      items: true,

      patient: {
        select: {
          id: true,
          name: true,
          dateOfBirth: true,
          gender: true,
        },
      },

      doctor: {
        select: {
          id: true,
          name: true,
          qualification: true,
          registrationNumber: true,
        },
      },

      organization: {
        select: {
          id: true,
          name: true,
          type: true,
          address: true,
          phone: true,
          email: true,
        },
      },

      consultation: {
        select: {
          id: true,
          chiefComplaint: true,
          diagnosis: true,
          notes: true,
          doctorRemarks: true,
          startedAt: true,
          completedAt: true,
        },
      },
    },
  });

  if (!prescription) {
    const error = new Error("Prescription not found");
    error.statusCode = 404;
    throw error;
  }

  return prescription;
};
const getPrescriptionPrintData = async ({ organizationId, prescriptionId }) => {
  const prescription = await prisma.prescription.findFirst({
    where: {
      id: prescriptionId,
      organizationId,
    },
    include: {
      items: {
        orderBy: {
          createdAt: "asc",
        },
      },

      patient: {
        select: {
          id: true,
          name: true,
          dateOfBirth: true,
          gender: true,
        },
      },

      doctor: {
        select: {
          id: true,
          name: true,
          qualification: true,
          registrationNumber: true,
        },
      },

      organization: {
        select: {
          id: true,
          name: true,
          type: true,
          address: true,
          phone: true,
          email: true,
        },
      },

      consultation: {
        select: {
          id: true,
          chiefComplaint: true,
          diagnosis: true,
          notes: true,
          doctorRemarks: true,
          startedAt: true,
          completedAt: true,
        },
      },
    },
  });

  if (!prescription) {
    const error = new Error("Prescription not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    prescription: {
      id: prescription.id,
      issuedAt: prescription.issuedAt,
    },

    organization: prescription.organization,

    patient: prescription.patient,

    doctor: prescription.doctor,

    consultation: prescription.consultation,

    medicines: prescription.items.map((item) => ({
      medicineName: item.medicineName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
    })),
  };
};

module.exports = {
  createPrescription,
  getPrescription,
  getPatientPrescription,
  getPrescriptionPrintData,
};
