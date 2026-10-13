const crypto = require("crypto");
const prisma = require("../../config/prisma");
const createAppointmentError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

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

  if (doctor.availabilityStatus !== "AVAILABLE") {
    const error = new Error("Doctor is currently unavailable");
    error.statusCode = 409;
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

    // 4d. Find or create day-level AppointmentWindow atomically
    const firstSchedule = schedules[0];
    const windowId = crypto.randomUUID();
    await tx.$executeRaw`
      INSERT INTO "AppointmentWindow" ("id", "organizationId", "doctorId", "date", "startTime", "endTime", "status", "createdAt", "updatedAt")
      VALUES (${windowId}, ${organizationId}, ${doctorId}, ${requestedDate}, ${firstSchedule.startTime}, ${firstSchedule.endTime}, ${"OPEN"}::"AppointmentWindowStatus", NOW(), NOW())
      ON CONFLICT ("doctorId", "date") DO NOTHING
    `;

    const appointmentWindow = await tx.appointmentWindow.findUnique({
      where: {
        doctorId_date: {
          doctorId,
          date: requestedDate,
        },
      },
    });

    // Lock the appointment window row to serialize capacity checks across concurrent requests
    await tx.$queryRaw`
      SELECT "id"
      FROM "AppointmentWindow"
      WHERE "id" = ${appointmentWindow.id}
      FOR UPDATE
    `;

    // Re-fetch window status after obtaining the lock to observe any state changes
    const lockedWindow = await tx.appointmentWindow.findUnique({
      where: { id: appointmentWindow.id },
    });

    // 4e. Check window status
    if (lockedWindow.status === "CLOSED") {
      const error = new Error("Appointment booking is closed for this date");
      error.statusCode = 400;
      throw error;
    }

    if (lockedWindow.status === "FULL") {
      const error = new Error("Appointment window is full for this date");
      error.statusCode = 400;
      throw error;
    }

    // 4f. Capacity check if configured (serialized under row lock)
    let activeCount = 0;
    if (lockedWindow.capacity) {
      activeCount = await tx.appointment.count({
        where: {
          organizationId,
          doctorId,
          appointmentDate: requestedDate,
          status: {
            notIn: ["CANCELLED", "NO_SHOW"],
          },
        },
      });

      if (activeCount >= lockedWindow.capacity) {
        await tx.appointmentWindow.update({
          where: { id: lockedWindow.id },
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

      // Ensure the counter row exists atomically.
      const counterId = crypto.randomUUID();
      await tx.$executeRaw`
        INSERT INTO "DoctorDailyTokenCounter" ("id", "organizationId", "doctorId", "date", "lastToken", "createdAt", "updatedAt")
        VALUES (${counterId}, ${organizationId}, ${doctorId}, ${requestedDate}, 0, NOW(), NOW())
        ON CONFLICT ("doctorId", "date") DO NOTHING
      `;

      // Lock the shared counter before assigning a token.
      await tx.$queryRaw`
        SELECT "doctorId"
        FROM "DoctorDailyTokenCounter"
        WHERE "doctorId" = ${doctorId}
          AND "date" = ${requestedDate}
        FOR UPDATE
      `;

      // Increment only after obtaining the lock.
      const tokenCounter = await tx.doctorDailyTokenCounter.update({
        where: {
          doctorId_date: {
            doctorId,
            date: requestedDate,
          },
        },
        data: {
          lastToken: {
            increment: 1,
          },
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

    // If this booking reached the window's capacity, mark the window as FULL
    if (lockedWindow.capacity && activeCount + 1 >= lockedWindow.capacity) {
      await tx.appointmentWindow.update({
        where: { id: lockedWindow.id },
        data: { status: "FULL" },
      });
    }

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
  }, {
    maxWait: 10000,
    timeout: 15000,
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

  const result = await prisma.$transaction(async (tx) => {
    // 1. Get the appointment to identify its doctor and date.
    const initialAppointment = await tx.appointment.findFirst({
      where: {
        id: appointmentId,
        organizationId,
      },
    });

    if (!initialAppointment) {
      const error = new Error("Appointment not found");
      error.statusCode = 404;
      throw error;
    }

    if (initialAppointment.status === "CONFIRMED") {
      return initialAppointment;
    }

    if (initialAppointment.status !== "PENDING") {
      const error = new Error("Only pending appointments can be confirmed");
      error.statusCode = 400;
      throw error;
    }

    const doctorId = initialAppointment.doctorId;
    const appointmentDate = initialAppointment.appointmentDate;

    // 2. Recheck doctor availability.
    const doctor = await tx.doctor.findFirst({
      where: {
        id: doctorId,
        organizationId,
        status: "ACTIVE",
        availabilityStatus: "AVAILABLE",
      },
    });

    if (!doctor) {
      const error = new Error("Doctor is currently unavailable");
      error.statusCode = 409;
      throw error;
    }

    // 3. Recheck the recurring schedule.
    const requestedDate = new Date(appointmentDate);
    const weekday = requestedDate.getUTCDay();

    const schedule = await tx.schedule.findFirst({
      where: {
        doctorId,
        weekday,
      },
    });

    if (!schedule) {
      const error = new Error("Doctor has no schedule for this date");
      error.statusCode = 409;
      throw error;
    }

    // 4. Lock the appointment window FIRST to serialize capacity checks across concurrent bookings/confirmations
    const windowId = crypto.randomUUID();
    await tx.$executeRaw`
      INSERT INTO "AppointmentWindow" ("id", "organizationId", "doctorId", "date", "startTime", "endTime", "status", "createdAt", "updatedAt")
      VALUES (${windowId}, ${organizationId}, ${doctorId}, ${appointmentDate}, ${schedule.startTime}, ${schedule.endTime}, ${"OPEN"}::"AppointmentWindowStatus", NOW(), NOW())
      ON CONFLICT ("doctorId", "date") DO NOTHING
    `;

    const appointmentWindow = await tx.appointmentWindow.findUnique({
      where: {
        doctorId_date: {
          doctorId,
          date: appointmentDate,
        },
      },
    });

    await tx.$queryRaw`
      SELECT "id"
      FROM "AppointmentWindow"
      WHERE "id" = ${appointmentWindow.id}
      FOR UPDATE
    `;

    const lockedWindow = await tx.appointmentWindow.findUnique({
      where: { id: appointmentWindow.id },
    });

    if (
      lockedWindow?.status === "CLOSED" ||
      lockedWindow?.status === "FULL"
    ) {
      const error = new Error("Appointment booking is closed for this date");
      error.statusCode = 409;
      throw error;
    }

    // 5. Recheck capacity while holding the shared window lock.
    let activeCount = 0;
    if (lockedWindow?.capacity != null) {
      activeCount = await tx.appointment.count({
        where: {
          organizationId,
          doctorId,
          appointmentDate,
          id: {
            not: initialAppointment.id,
          },
          status: {
            notIn: ["CANCELLED", "NO_SHOW"],
          },
        },
      });

      if (activeCount >= lockedWindow.capacity) {
        await tx.appointmentWindow.update({
          where: { id: lockedWindow.id },
          data: { status: "FULL" },
        });

        const error = new Error(
          "Appointment capacity is full for this date",
        );
        error.statusCode = 409;
        throw error;
      }
    }

    // 6. Ensure and lock the daily counter row (after acquiring the window lock).
    const counterId = crypto.randomUUID();
    await tx.$executeRaw`
      INSERT INTO "DoctorDailyTokenCounter" ("id", "organizationId", "doctorId", "date", "lastToken", "createdAt", "updatedAt")
      VALUES (${counterId}, ${organizationId}, ${doctorId}, ${appointmentDate}, 0, NOW(), NOW())
      ON CONFLICT ("doctorId", "date") DO NOTHING
    `;

    await tx.$queryRaw`
      SELECT "doctorId"
      FROM "DoctorDailyTokenCounter"
      WHERE "doctorId" = ${doctorId}
        AND "date" = ${appointmentDate}
      FOR UPDATE
    `;

    // 7. Re-read appointment after acquiring locks.
    const currentAppointment = await tx.appointment.findFirst({
      where: {
        id: appointmentId,
        organizationId,
      },
    });

    if (!currentAppointment) {
      const error = new Error("Appointment not found");
      error.statusCode = 404;
      throw error;
    }

    if (
      currentAppointment.appointmentDate.getTime() !==
      appointmentDate.getTime()
    ) {
      const error = new Error(
        "Appointment date changed concurrently. Please retry confirmation.",
      );
      error.statusCode = 409;
      throw error;
    }

    if (currentAppointment.status === "CONFIRMED") {
      return currentAppointment;
    }

    if (currentAppointment.status !== "PENDING") {
      const error = new Error("Only pending appointments can be confirmed");
      error.statusCode = 400;
      throw error;
    }

    // 8. Increment the existing, locked counter atomically.
    const tokenCounter = await tx.doctorDailyTokenCounter.update({
      where: {
        doctorId_date: {
          doctorId,
          date: appointmentDate,
        },
      },
      data: {
        lastToken: { increment: 1 },
      },
    });

    // 9. Confirm the appointment and assign its token.
    const confirmedAppointment = await tx.appointment.update({
      where: {
        id: currentAppointment.id,
      },
      data: {
        status: "CONFIRMED",
        tokenNumber: tokenCounter.lastToken,
      },
    });

    // If confirming this appointment reached the window capacity, mark window FULL
    if (lockedWindow?.capacity && activeCount + 1 >= lockedWindow.capacity) {
      await tx.appointmentWindow.update({
        where: { id: lockedWindow.id },
        data: { status: "FULL" },
      });
    }

    return confirmedAppointment;
  }, {
    maxWait: 10000,
    timeout: 15000,
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
  const cancelledAppointment = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findFirst({
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

    if (appointment.status === "CANCELLED") {
      const error = new Error("Appointment is already cancelled");
      error.statusCode = 400;
      throw error;
    }

    if (appointment.status === "COMPLETED") {
      const error = new Error("Completed appointment cannot be cancelled");
      error.statusCode = 400;
      throw error;
    }

    if (appointment.status === "NO_SHOW") {
      const error = new Error("No-show appointment cannot be cancelled");
      error.statusCode = 400;
      throw error;
    }

    // Conditional update: only cancel if the status
    // still matches the status we just read.
    const result = await tx.appointment.updateMany({
      where: {
        id: appointment.id,
        organizationId,
        status: appointment.status,
      },
      data: {
        status: "CANCELLED",
      },
    });

    if (result.count !== 1) {
      const error = new Error(
        "Appointment status changed. Please refresh and try again.",
      );
      error.statusCode = 409;
      throw error;
    }

    // Reopen window if it was FULL and cancellation freed up capacity
    const appointmentWindow = await tx.appointmentWindow.findUnique({
      where: {
        doctorId_date: {
          doctorId: appointment.doctorId,
          date: appointment.appointmentDate,
        },
      },
    });

    if (
      appointmentWindow &&
      appointmentWindow.status === "FULL" &&
      appointmentWindow.capacity != null
    ) {
      const activeCount = await tx.appointment.count({
        where: {
          organizationId,
          doctorId: appointment.doctorId,
          appointmentDate: appointment.appointmentDate,
          status: {
            notIn: ["CANCELLED", "NO_SHOW"],
          },
        },
      });

      if (activeCount < appointmentWindow.capacity) {
        await tx.appointmentWindow.update({
          where: { id: appointmentWindow.id },
          data: { status: "OPEN" },
        });
      }
    }

    return tx.appointment.findFirst({
      where: {
        id: appointment.id,
        organizationId,
      },
      include: {
        payment: true,
      },
    });
  }, {
    maxWait: 10000,
    timeout: 15000,
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
const markAppointmentNoShow = async ({ organizationId, appointmentId }) => {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId,
    },
  });

  if (!appointment) {
    const error = new Error("Appointment not found");
    error.statusCode = 404;
    throw error;
  }

  if (appointment.status === "NO_SHOW") {
    const error = new Error("Appointment is already marked as no-show");
    error.statusCode = 400;
    throw error;
  }

  if (appointment.status === "CANCELLED") {
    const error = new Error(
      "Cancelled appointment cannot be marked as no-show",
    );
    error.statusCode = 400;
    throw error;
  }

  if (appointment.status === "COMPLETED") {
    const error = new Error(
      "Completed appointment cannot be marked as no-show",
    );
    error.statusCode = 400;
    throw error;
  }

  if (appointment.status !== "CONFIRMED") {
    const error = new Error(
      "Only confirmed appointments can be marked as no-show",
    );
    error.statusCode = 400;
    throw error;
  }

  const updatedAppointment = await prisma.appointment.update({
    where: {
      id: appointment.id,
    },
    data: {
      status: "NO_SHOW",
    },
  });

  return updatedAppointment;
};
const getDoctorAppointments = async ({
  organizationId,
  doctorId,
  appointmentDate,
}) => {
  const requestedDate = new Date(appointmentDate);

  if (Number.isNaN(requestedDate.getTime())) {
    const error = new Error("Invalid appointment date");
    error.statusCode = 400;
    throw error;
  }

  requestedDate.setUTCHours(0, 0, 0, 0);

  // Verify doctor belongs to this organization
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

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      doctorId,
      appointmentDate: requestedDate,
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

      appointmentWindow: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      },
    },

    orderBy: [
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

const rescheduleAppointment = async ({
  organizationId,
  appointmentId,
  appointmentDate,
  user,
}) => {
  if (!user || !user.userId) {
    throw createAppointmentError("Authentication required", 401);
  }

  const newDate = new Date(appointmentDate);

  if (Number.isNaN(newDate.getTime())) {
    throw createAppointmentError("Invalid appointment date", 400);
  }

  // Keep the same date representation used by createAppointment.
  newDate.setUTCHours(0, 0, 0, 0);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (newDate <= today) {
    throw createAppointmentError(
      "Rescheduling date must be in the future",
      400,
    );
  }

  const initialAppointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId,
    },
    include: {
      payment: true,
      queue: true,
    },
  });

  if (!initialAppointment) {
    throw createAppointmentError("Appointment not found", 404);
  }

  if (initialAppointment.appointmentDate.getTime() === newDate.getTime()) {
    throw createAppointmentError(
      "New date must be different from the current appointment date",
      400,
    );
  }

  // Authorization:
  // - Super Admin can manage appointments.
  // - Patients can reschedule only their own appointments.
  // - A doctor can reschedule appointments assigned to them.
  // - Organization staff need an active membership with an allowed role.

  if (user.role !== "SUPER_ADMIN") {
    if (user.role === "PATIENT") {
      const patient = await prisma.patient.findFirst({
        where: {
          userId: user.userId,
          id: initialAppointment.patientId,
        },
        select: {
          id: true,
        },
      });

      if (!patient) {
        throw createAppointmentError(
          "You can only reschedule your own appointments",
          403,
        );
      }
    } else if (user.role === "DOCTOR") {
      const doctor = await prisma.doctor.findFirst({
        where: {
          id: user.doctorId,
          userId: user.userId,
          organizationId,
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

      if (!doctor || doctor.id !== initialAppointment.doctorId) {
        throw createAppointmentError(
          "You can only reschedule appointments assigned to you",
          403,
        );
      }
    } else {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId: user.userId,
          organizationId,
          status: "ACTIVE",
          role: {
            in: ["ADMIN", "MANAGER", "RECEPTIONIST", "NURSE"],
          },
        },
        select: {
          id: true,
        },
      });

      if (!membership) {
        throw createAppointmentError(
          "You are not authorized to reschedule appointments in this organization",
          403,
        );
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    const oldDate = initialAppointment.appointmentDate;
    const doctorId = initialAppointment.doctorId;

    // 1. The doctor must remain the same, active, and available.
    const doctor = await tx.doctor.findFirst({
      where: {
        id: doctorId,
        organizationId,
        status: "ACTIVE",
        availabilityStatus: "AVAILABLE",
      },
    });

    if (!doctor) {
      throw createAppointmentError("Doctor is currently unavailable", 409);
    }

    // 2. Validate the recurring schedule for the destination date.
    const weekday = newDate.getUTCDay();

    const schedule = await tx.schedule.findFirst({
      where: {
        doctorId,
        weekday,
      },
    });

    if (!schedule) {
      throw createAppointmentError(
        "Doctor has no schedule for the selected date",
        409,
      );
    }

    // 3. Find or create the destination appointment window atomically.
    const destWindowId = crypto.randomUUID();
    await tx.$executeRaw`
      INSERT INTO "AppointmentWindow" ("id", "organizationId", "doctorId", "date", "startTime", "endTime", "status", "createdAt", "updatedAt")
      VALUES (${destWindowId}, ${organizationId}, ${doctorId}, ${newDate}, ${schedule.startTime}, ${schedule.endTime}, ${"OPEN"}::"AppointmentWindowStatus", NOW(), NOW())
      ON CONFLICT ("doctorId", "date") DO NOTHING
    `;

    const appointmentWindow = await tx.appointmentWindow.findUnique({
      where: {
        doctorId_date: {
          doctorId,
          date: newDate,
        },
      },
    });

    if (appointmentWindow.organizationId !== organizationId) {
      throw createAppointmentError(
        "Appointment window does not belong to this organization",
        409,
      );
    }

    // 4. Lock the destination appointment window FIRST to serialize capacity checks across concurrent bookings/reschedules
    await tx.$queryRaw`
      SELECT "id"
      FROM "AppointmentWindow"
      WHERE "id" = ${appointmentWindow.id}
      FOR UPDATE
    `;

    const lockedDestWindow = await tx.appointmentWindow.findUnique({
      where: { id: appointmentWindow.id },
    });

    if (
      lockedDestWindow?.status === "CLOSED" ||
      lockedDestWindow?.status === "FULL"
    ) {
      throw createAppointmentError(
        "Appointment booking is closed for the selected date",
        409,
      );
    }

    // 5. Prevent duplicate active appointments for the same patient, doctor, and destination date.
    const duplicateAppointment = await tx.appointment.findFirst({
      where: {
        organizationId,
        patientId: initialAppointment.patientId,
        doctorId,
        appointmentDate: newDate,
        id: {
          not: initialAppointment.id,
        },
        status: {
          notIn: ["CANCELLED", "NO_SHOW"],
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateAppointment) {
      throw createAppointmentError(
        "Patient already has an appointment with this doctor on the selected date",
        409,
      );
    }

    // 6. Capacity counts both PENDING and CONFIRMED bookings.
    // CANCELLED and NO_SHOW appointments do not occupy capacity.
    let activeCount = 0;
    if (lockedDestWindow?.capacity != null) {
      activeCount = await tx.appointment.count({
        where: {
          organizationId,
          doctorId,
          appointmentDate: newDate,
          status: {
            notIn: ["CANCELLED", "NO_SHOW"],
          },
        },
      });

      if (activeCount >= lockedDestWindow.capacity) {
        await tx.appointmentWindow.update({
          where: { id: lockedDestWindow.id },
          data: { status: "FULL" },
        });

        throw createAppointmentError(
          "Appointment capacity is full for the selected date",
          409,
        );
      }
    }

    // 7. Lock the appointment row before modifying it.
    await tx.$queryRaw`
      SELECT "id"
      FROM "Appointment"
      WHERE "id" = ${appointmentId}
        AND "organizationId" = ${organizationId}
      FOR UPDATE
    `;

    // Re-read after acquiring locks to detect concurrent changes.
    const appointment = await tx.appointment.findFirst({
      where: {
        id: appointmentId,
        organizationId,
      },
      include: {
        payment: true,
        queue: true,
      },
    });

    if (!appointment) {
      throw createAppointmentError("Appointment not found", 404);
    }

    if (appointment.appointmentDate.getTime() !== oldDate.getTime()) {
      throw createAppointmentError(
        "Appointment date changed concurrently. Please refresh and try again",
        409,
      );
    }

    if (
      appointment.status !== "PENDING" &&
      appointment.status !== "CONFIRMED"
    ) {
      throw createAppointmentError(
        "Only pending or confirmed appointments can be rescheduled",
        400,
      );
    }

    if (appointment.queue && appointment.queue.status !== "WAITING") {
      throw createAppointmentError(
        "Appointment cannot be rescheduled after queue processing has started",
        409,
      );
    }

    let tokenNumber = null;

    // 8. If confirmed, lock the destination daily counter and assign a new token number.
    if (appointment.status === "CONFIRMED") {
      const counterId = crypto.randomUUID();
      await tx.$executeRaw`
        INSERT INTO "DoctorDailyTokenCounter" ("id", "organizationId", "doctorId", "date", "lastToken", "createdAt", "updatedAt")
        VALUES (${counterId}, ${organizationId}, ${doctorId}, ${newDate}, 0, NOW(), NOW())
        ON CONFLICT ("doctorId", "date") DO NOTHING
      `;

      await tx.$queryRaw`
        SELECT "doctorId"
        FROM "DoctorDailyTokenCounter"
        WHERE "doctorId" = ${doctorId}
          AND "date" = ${newDate}
        FOR UPDATE
      `;

      const tokenCounter = await tx.doctorDailyTokenCounter.update({
        where: {
          doctorId_date: {
            doctorId,
            date: newDate,
          },
        },
        data: {
          lastToken: {
            increment: 1,
          },
        },
      });

      tokenNumber = tokenCounter.lastToken;
    }

    // Update the appointment atomically.
    // Payment and the existing WAITING queue entry are preserved.
    const result = await tx.appointment.updateMany({
      where: {
        id: appointment.id,
        organizationId,
        status: appointment.status,
        appointmentDate: oldDate,
      },
      data: {
        appointmentDate: newDate,
        startAt: newDate,
        endAt: newDate,
        appointmentWindowId: lockedDestWindow.id,
        tokenNumber,
      },
    });

    if (result.count !== 1) {
      throw createAppointmentError(
        "Appointment changed concurrently. Please refresh and try again",
        409,
      );
    }

    // If destination window reached capacity, mark FULL
    if (lockedDestWindow?.capacity && activeCount + 1 >= lockedDestWindow.capacity) {
      await tx.appointmentWindow.update({
        where: { id: lockedDestWindow.id },
        data: { status: "FULL" },
      });
    }

    // Reopen old date's window if moving away freed up space
    const oldWindow = await tx.appointmentWindow.findUnique({
      where: {
        doctorId_date: {
          doctorId,
          date: oldDate,
        },
      },
    });

    if (oldWindow && oldWindow.status === "FULL" && oldWindow.capacity != null) {
      const oldActiveCount = await tx.appointment.count({
        where: {
          organizationId,
          doctorId,
          appointmentDate: oldDate,
          status: {
            notIn: ["CANCELLED", "NO_SHOW"],
          },
        },
      });

      if (oldActiveCount < oldWindow.capacity) {
        await tx.appointmentWindow.update({
          where: { id: oldWindow.id },
          data: { status: "OPEN" },
        });
      }
    }

    return tx.appointment.findFirst({
      where: {
        id: appointment.id,
        organizationId,
      },
      include: {
        payment: true,
        queue: true,
        doctor: true,
      },
    });
  }, {
    maxWait: 10000,
    timeout: 15000,
  });
};

module.exports = {
  createAppointment,
  confirmAppointment,
  getPatientUpcomingAppointments,
  cancelAppointment,
  getAppointmentById,
  getPatientAppointmentHistory,
  getOrganizationAppointments,
  markAppointmentNoShow,
  getDoctorAppointments,
  rescheduleAppointment,
};
