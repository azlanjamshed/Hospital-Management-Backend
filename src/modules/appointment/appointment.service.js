const prisma = require("../../config/prisma");

const createAppointment = async ({
  organizationId,
  patientId,
  doctorId,
  appointmentDate,
  paymentMethod,
  source,
}) => {
  // 1. Validate appointment date
  const requestedDate = new Date(appointmentDate);
  if (Number.isNaN(requestedDate.getTime())) {
    const error = new Error("Invalid appointment date");
    error.statusCode = 400;
    throw error;
  }
  requestedDate.setUTCHours(0, 0, 0, 0);

  // 2. Check doctor belongs to organization and is active
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      organizationId,
      status: "ACTIVE",
    },
  });

  if (!doctor) {
    const error = new Error(
      "Doctor not found or inactive in this organization",
    );
    error.statusCode = 404;
    throw error;
  }

  // 3. Check doctor's recurring schedule for requested weekday (using UTC)
  const weekday = requestedDate.getUTCDay();
  const schedules = await prisma.schedule.findMany({
    where: {
      doctorId,
      weekday,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  if (schedules.length === 0) {
    const error = new Error("Doctor is not available on this day");
    error.statusCode = 400;
    throw error;
  }

  // 4. Execute all mutations inside a single atomic database transaction
  const result = await prisma.$transaction(async (tx) => {
    // 4a. Verify patient exists by Patient.id (strict contract)
    const patient = await tx.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      const error = new Error("Patient not found");
      error.statusCode = 404;
      throw error;
    }

    // 4b. Prevent duplicate appointment for this patient with this doctor on the same date
    const existingAppointment = await tx.appointment.findFirst({
      where: {
        organizationId,
        patientId,
        doctorId,
        appointmentDate: requestedDate,
        status: {
          notIn: ["CANCELLED", "NO_SHOW"],
        },
      },
    });

    if (existingAppointment) {
      const error = new Error(
        "Patient already has an appointment with this doctor on this date",
      );
      error.statusCode = 409;
      throw error;
    }

    // 4c. Check / Auto-link Patient to Organization with safe atomic MRN sequence
    let patientOrganization = await tx.patientOrganization.findUnique({
      where: {
        patientId_organizationId: {
          patientId,
          organizationId,
        },
      },
    });

    if (!patientOrganization) {
      const sequence = await tx.organizationPatientSequence.upsert({
        where: { organizationId },
        update: {
          lastNumber: { increment: 1 },
        },
        create: {
          organizationId,
          lastNumber: 1,
        },
      });

      const hospitalPatientNumber = `P${String(sequence.lastNumber).padStart(6, "0")}`;

      patientOrganization = await tx.patientOrganization.create({
        data: {
          patientId,
          organizationId,
          hospitalPatientNumber,
        },
      });
    }

    // 4d. Find or create day-level AppointmentWindow
    let appointmentWindow = await tx.appointmentWindow.findUnique({
      where: {
        doctorId_date: {
          doctorId,
          date: requestedDate,
        },
      },
    });

    if (!appointmentWindow) {
      const firstSchedule = schedules[0];
      appointmentWindow = await tx.appointmentWindow.create({
        data: {
          organizationId,
          doctorId,
          date: requestedDate,
          startTime: firstSchedule.startTime,
          endTime: firstSchedule.endTime,
          status: "OPEN",
        },
      });
    }

    // 4e. Check window status
    if (appointmentWindow.status === "CLOSED") {
      const error = new Error("Appointment booking is closed for this date");
      error.statusCode = 400;
      throw error;
    }

    if (appointmentWindow.status === "FULL") {
      const error = new Error("Appointment window is full for this date");
      error.statusCode = 400;
      throw error;
    }

    // 4f. Capacity check if configured
    if (appointmentWindow.capacity) {
      const activeCount = await tx.appointment.count({
        where: {
          doctorId,
          appointmentDate: requestedDate,
          status: {
            notIn: ["CANCELLED", "NO_SHOW"],
          },
        },
      });

      if (activeCount >= appointmentWindow.capacity) {
        await tx.appointmentWindow.update({
          where: { id: appointmentWindow.id },
          data: { status: "FULL" },
        });

        const error = new Error("Appointment window is full for this date");
        error.statusCode = 400;
        throw error;
      }
    }

    // 4g. Determine patient type
    const lastCompletedAppointment = await tx.appointment.findFirst({
      where: {
        organizationId,
        patientId,
        status: "COMPLETED",
      },
      orderBy: {
        appointmentDate: "desc",
      },
    });

    let patientType = "NEW";
    if (lastCompletedAppointment) {
      const lastVisitDate = new Date(lastCompletedAppointment.appointmentDate);
      const diffInMilliseconds =
        requestedDate.getTime() - lastVisitDate.getTime();
      const diffInDays = diffInMilliseconds / (1000 * 60 * 60 * 24);

      if (diffInDays <= doctor.followUpPeriodDays) {
        patientType = "FOLLOW_UP";
      } else {
        patientType = "EXISTING";
      }
    }

    // 4h. Atomic daily token generation for PAY_AT_HOSPITAL
    let tokenNumber = null;
    let appointmentStatus = "PENDING";

    if (paymentMethod === "PAY_AT_HOSPITAL") {
      appointmentStatus = "CONFIRMED";

      const tokenCounter = await tx.doctorDailyTokenCounter.upsert({
        where: {
          doctorId_date: {
            doctorId,
            date: requestedDate,
          },
        },
        update: {
          lastToken: { increment: 1 },
        },
        create: {
          organizationId,
          doctorId,
          date: requestedDate,
          lastToken: 1,
        },
      });

      tokenNumber = tokenCounter.lastToken;
    }

    // 4i. Create Appointment
    const appointment = await tx.appointment.create({
      data: {
        organizationId,
        patientId,
        doctorId,
        appointmentWindowId: appointmentWindow.id,
        appointmentDate: requestedDate,
        startAt: requestedDate,
        endAt: requestedDate,
        patientType,
        tokenNumber,
        consultationFeeMinor: doctor.consultationFeeMinor || 0,
        source: source || "PATIENT_APP",
        status: appointmentStatus,
      },
    });

    // 4j. Create Payment
    const payment = await tx.payment.create({
      data: {
        appointmentId: appointment.id,
        amountMinor: appointment.consultationFeeMinor,
        method: paymentMethod,
        status: "PENDING",
      },
    });

    return {
      appointment,
      payment,
      hospitalPatientNumber: patientOrganization.hospitalPatientNumber,
    };
  });

  return result;
};

const confirmAppointment = async ({ organizationId, appointmentId }) => {
  // 1. Find appointment with tenant isolation
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId,
    },
    include: {
      payment: true,
    },
  });

  if (!appointment) {
    const error = new Error("Appointment not found");
    error.statusCode = 404;
    throw error;
  }

  // Idempotency: If already confirmed, return existing appointment immediately without generating another token
  if (appointment.status === "CONFIRMED") {
    return appointment;
  }

  if (appointment.status !== "PENDING") {
    const error = new Error("Only pending appointments can be confirmed");
    error.statusCode = 400;
    throw error;
  }

  if (!appointment.payment) {
    const error = new Error("Payment record not found");
    error.statusCode = 400;
    throw error;
  }

  // Online appointments can only be confirmed after successful payment
  if (
    appointment.payment.method === "ONLINE" &&
    appointment.payment.status !== "PAID"
  ) {
    const error = new Error("Online payment is not completed");
    error.statusCode = 400;
    throw error;
  }

  // Atomic confirmation and token assignment
  const result = await prisma.$transaction(async (tx) => {
    // Re-verify status within transaction to guard against concurrent duplicate webhooks/calls
    const currentAppointment = await tx.appointment.findFirst({
      where: {
        id: appointment.id,
        organizationId,
      },
    });

    if (currentAppointment.status === "CONFIRMED") {
      return currentAppointment;
    }

    // Atomic increment using DoctorDailyTokenCounter
    const tokenCounter = await tx.doctorDailyTokenCounter.upsert({
      where: {
        doctorId_date: {
          doctorId: currentAppointment.doctorId,
          date: currentAppointment.appointmentDate,
        },
      },
      update: {
        lastToken: { increment: 1 },
      },
      create: {
        organizationId,
        doctorId: currentAppointment.doctorId,
        date: currentAppointment.appointmentDate,
        lastToken: 1,
      },
    });

    const updatedAppointment = await tx.appointment.update({
      where: {
        id: currentAppointment.id,
      },
      data: {
        status: "CONFIRMED",
        tokenNumber: tokenCounter.lastToken,
      },
    });

    return updatedAppointment;
  });

  return result;
};
const getPatientUpcomingAppointments = async ({
  organizationId,
  patientId,
}) => {
  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      patientId,
      appointmentDate: {
        gte: new Date(),
      },
      status: {
        in: ["PENDING", "CONFIRMED"],
      },
    },

    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          qualification: true,
          consultationFeeMinor: true,
        },
      },

      appointmentWindow: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      },

      payment: {
        select: {
          id: true,
          method: true,
          status: true,
          amountMinor: true,
          paidAt: true,
        },
      },
    },

    orderBy: [
      {
        appointmentDate: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  return appointments;
};
const cancelAppointment = async ({ organizationId, appointmentId }) => {
  // 1. Find appointment with tenant isolation
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId,
    },
    include: {
      payment: true,
    },
  });

  if (!appointment) {
    const error = new Error("Appointment not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Already cancelled
  if (appointment.status === "CANCELLED") {
    const error = new Error("Appointment is already cancelled");
    error.statusCode = 400;
    throw error;
  }

  // 3. Completed appointments cannot be cancelled
  if (appointment.status === "COMPLETED") {
    const error = new Error("Completed appointment cannot be cancelled");
    error.statusCode = 400;
    throw error;
  }

  // 4. No-show appointments cannot be cancelled
  if (appointment.status === "NO_SHOW") {
    const error = new Error("No-show appointment cannot be cancelled");
    error.statusCode = 400;
    throw error;
  }

  // 5. Cancel appointment
  const cancelledAppointment = await prisma.appointment.update({
    where: {
      id: appointment.id,
    },
    data: {
      status: "CANCELLED",
    },
    include: {
      payment: true,
    },
  });

  return cancelledAppointment;
};
const getAppointmentById = async ({ organizationId, appointmentId }) => {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId,
    },

    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          qualification: true,
          registrationNumber: true,
          consultationFeeMinor: true,
          followUpPeriodDays: true,
          status: true,
        },
      },

      patient: {
        select: {
          id: true,
          name: true,
          dateOfBirth: true,
          gender: true,

          phones: {
            select: {
              phone: true,
            },
          },
        },
      },

      appointmentWindow: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
          capacity: true,
        },
      },

      payment: {
        select: {
          id: true,
          amountMinor: true,
          method: true,
          status: true,
          transactionId: true,
          paidAt: true,
        },
      },

      queue: {
        select: {
          id: true,
          status: true,
          checkedInAt: true,
          calledAt: true,
          completedAt: true,
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

  if (!appointment) {
    const error = new Error("Appointment not found");
    error.statusCode = 404;
    throw error;
  }

  return appointment;
};
const getPatientAppointmentHistory = async ({ organizationId, patientId }) => {
  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      patientId,
      status: {
        in: ["COMPLETED", "CANCELLED", "NO_SHOW"],
      },
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

      payment: {
        select: {
          id: true,
          amountMinor: true,
          method: true,
          status: true,
          paidAt: true,
        },
      },

      queue: {
        select: {
          id: true,
          status: true,
          checkedInAt: true,
          calledAt: true,
          completedAt: true,
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

    orderBy: {
      appointmentDate: "desc",
    },
  });

  return appointments;
};
const getOrganizationAppointments = async ({
  organizationId,
  appointmentDate,
  doctorId,
  status,
  patientId,
}) => {
  const requestedDate = new Date(appointmentDate);

  if (Number.isNaN(requestedDate.getTime())) {
    const error = new Error("Invalid appointment date");
    error.statusCode = 400;
    throw error;
  }

  requestedDate.setUTCHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      appointmentDate: requestedDate,

      ...(doctorId && {
        doctorId,
      }),

      ...(patientId && {
        patientId,
      }),

      ...(status && {
        status,
      }),
    },

    include: {
      patient: {
        select: {
          id: true,
          name: true,
          dateOfBirth: true,
          gender: true,

          phones: {
            select: {
              phone: true,
            },
          },
        },
      },

      doctor: {
        select: {
          id: true,
          name: true,
          qualification: true,
          status: true,
        },
      },

      appointmentWindow: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
          capacity: true,
        },
      },

      payment: {
        select: {
          id: true,
          amountMinor: true,
          method: true,
          status: true,
          paidAt: true,
        },
      },

      queue: {
        select: {
          id: true,
          status: true,
          checkedInAt: true,
          calledAt: true,
          completedAt: true,
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

    orderBy: [
      {
        doctorId: "asc",
      },
      {
        tokenNumber: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  return appointments;
};
module.exports = {
  createAppointment,
  confirmAppointment,
  getPatientUpcomingAppointments,
  cancelAppointment,
  getAppointmentById,
  getPatientAppointmentHistory,
  getOrganizationAppointments,
};
