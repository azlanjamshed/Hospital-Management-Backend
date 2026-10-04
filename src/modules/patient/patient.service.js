const prisma = require("../../config/prisma");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const generateHospitalPatientNumber = async (tx, organizationId) => {
  const lastPatient = await tx.patientOrganization.findFirst({
    where: {
      organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const nextNumber = lastPatient
    ? parseInt(lastPatient.hospitalPatientNumber.replace(/\D/g, ""), 10) + 1
    : 1;

  return `P${String(nextNumber).padStart(6, "0")}`;
};

const createPatient = async (organizationId, data) => {
  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  if (!data.email && !data.phone) {
    const error = new Error("Patient email or phone number is required");
    error.statusCode = 400;
    throw error;
  }

  /*
   * Check whether a User already exists.
   */
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        data.email ? { email: data.email } : undefined,
        data.phone ? { phone: data.phone } : undefined,
      ].filter(Boolean),
    },
  });

  /*
   * Existing global patient
   */
  if (existingUser) {
    const existingPatient = await prisma.patient.findUnique({
      where: {
        userId: existingUser.id,
      },
    });

    if (existingPatient) {
      const existingRelationship = await prisma.patientOrganization.findUnique({
        where: {
          patientId_organizationId: {
            patientId: existingPatient.id,
            organizationId,
          },
        },
      });

      if (existingRelationship) {
        const error = new Error("Patient already exists in this organization");
        error.statusCode = 409;
        throw error;
      }

      const patientOrganization = await prisma.$transaction(async (tx) => {
        const hospitalPatientNumber = await generateHospitalPatientNumber(
          tx,
          organizationId,
        );

        return tx.patientOrganization.create({
          data: {
            patientId: existingPatient.id,
            organizationId,
            hospitalPatientNumber,
          },
        });
      });

      return {
        patient: existingPatient,
        patientOrganization,
        existingPatient: true,
      };
    }

    const error = new Error("A user with this email or phone already exists");
    error.statusCode = 409;
    throw error;
  }

  /*
   * New patient
   */
  const temporaryPassword = crypto.randomBytes(32).toString("hex");

  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: "PATIENT",
      },
    });

    const patient = await tx.patient.create({
      data: {
        userId: user.id,
        name: data.name,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
      },
    });

    if (data.phone) {
      await tx.patientPhone.create({
        data: {
          patientId: patient.id,
          phone: data.phone,
          isPrimary: true,
        },
      });
    }

    const hospitalPatientNumber = await generateHospitalPatientNumber(
      tx,
      organizationId,
    );

    const patientOrganization = await tx.patientOrganization.create({
      data: {
        patientId: patient.id,
        organizationId,
        hospitalPatientNumber,
      },
    });

    return {
      user,
      patient,
      patientOrganization,
    };
  });

  return {
    ...result,
    existingPatient: false,
  };
};

const searchPatients = async (organizationId, filters) => {
  const { phone, email, hospitalPatientNumber, name, dateOfBirth } = filters;

  const conditions = [
    phone
      ? {
          phones: {
            some: {
              phone,
            },
          },
        }
      : null,

    email
      ? {
          user: {
            email,
          },
        }
      : null,

    hospitalPatientNumber
      ? {
          organizations: {
            some: {
              organizationId,
              hospitalPatientNumber,
            },
          },
        }
      : null,

    name
      ? {
          name: {
            contains: name,
            mode: "insensitive",
          },
        }
      : null,

    dateOfBirth
      ? {
          dateOfBirth,
        }
      : null,
  ].filter(Boolean);

  const patients = await prisma.patient.findMany({
    where: {
      AND: conditions,
    },

    select: {
      id: true,
      name: true,
      dateOfBirth: true,
      gender: true,

      user: {
        select: {
          email: true,
          phone: true,
        },
      },

      phones: {
        select: {
          phone: true,
          isPrimary: true,
          verified: true,
        },
      },

      organizations: {
        where: {
          organizationId,
        },
        select: {
          hospitalPatientNumber: true,
          createdAt: true,
        },
      },
    },

    take: 20,

    orderBy: {
      createdAt: "desc",
    },
  });

  return patients;
};
const linkPatientToOrganization = async (organizationId, patientId) => {
  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  const patient = await prisma.patient.findUnique({
    where: {
      id: patientId,
    },
  });

  if (!patient) {
    const error = new Error("Patient not found");
    error.statusCode = 404;
    throw error;
  }

  const existingRelationship = await prisma.patientOrganization.findUnique({
    where: {
      patientId_organizationId: {
        patientId,
        organizationId,
      },
    },
  });

  if (existingRelationship) {
    const error = new Error("Patient already exists in this organization");
    error.statusCode = 409;
    throw error;
  }

  const hospitalPatientNumber = await generateHospitalPatientNumber(
    prisma,
    organizationId,
  );

  const patientOrganization = await prisma.patientOrganization.create({
    data: {
      patientId,
      organizationId,
      hospitalPatientNumber,
    },
  });

  return patientOrganization;
};
const getPatientById = async (organizationId, patientId) => {
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      organizations: {
        some: {
          organizationId,
        },
      },
    },

    select: {
      id: true,
      name: true,
      dateOfBirth: true,
      gender: true,

      user: {
        select: {
          email: true,
          phone: true,
        },
      },

      phones: {
        select: {
          phone: true,
          isPrimary: true,
          verified: true,
        },
      },

      organizations: {
        where: {
          organizationId,
        },
        select: {
          id: true,
          hospitalPatientNumber: true,
          createdAt: true,
        },
      },
    },
  });

  if (!patient) {
    const error = new Error("Patient not found in this organization");
    error.statusCode = 404;
    throw error;
  }

  return patient;
};
const getPatientAppointments = async ({ organizationId, patientId }) => {
  // Check patient belongs to this organization
  const patientOrganization = await prisma.patientOrganization.findUnique({
    where: {
      patientId_organizationId: {
        patientId,
        organizationId,
      },
    },
    include: {
      patient: true,
    },
  });

  if (!patientOrganization) {
    const error = new Error("Patient does not belong to this organization");

    error.statusCode = 404;
    throw error;
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      patientId,
    },
    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          qualification: true,
        },
      },

      appointmentWindow: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
        },
      },
    },

    orderBy: {
      appointmentDate: "desc",
    },
  });

  return {
    patient: {
      id: patientOrganization.patient.id,
      name: patientOrganization.patient.name,
      hospitalPatientNumber: patientOrganization.hospitalPatientNumber,
    },

    appointments,
  };
};

const getPatientMedicalHistory = async ({ organizationId, patientId }) => {
  // 1. Verify patient belongs to this organization
  const patientOrganization = await prisma.patientOrganization.findUnique({
    where: {
      patientId_organizationId: {
        patientId,
        organizationId,
      },
    },
  });

  if (!patientOrganization) {
    const error = new Error("Patient does not belong to this organization");
    error.statusCode = 404;
    throw error;
  }

  // 2. Get patient's clinical history
  const consultations = await prisma.consultation.findMany({
    where: {
      organizationId,
      patientId,
    },

    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          qualification: true,
        },
      },

      appointment: {
        select: {
          id: true,
          appointmentDate: true,
          patientType: true,
          tokenNumber: true,
          status: true,
        },
      },

      prescription: {
        select: {
          id: true,
          issuedAt: true,

          items: {
            select: {
              id: true,
              medicineName: true,
              dosage: true,
              frequency: true,
              duration: true,
              instructions: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return consultations;
};

module.exports = {
  createPatient,
  searchPatients,
  linkPatientToOrganization,
  getPatientById,
  getPatientAppointments,
  getPatientMedicalHistory,
};
