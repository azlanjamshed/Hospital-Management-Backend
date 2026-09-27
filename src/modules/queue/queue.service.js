const prisma = require("../../config/prisma");

const checkInAppointment = async ({ organizationId, appointmentId }) => {
  // 1. Find appointment with tenant isolation
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId,
    },
    include: {
      queue: true,
    },
  });

  if (!appointment) {
    const error = new Error("Appointment not found in this organization");
    error.statusCode = 404;
    throw error;
  }

  // 2. Validate appointment status: ONLY CONFIRMED appointments can check in
  if (appointment.status !== "CONFIRMED") {
    const statusErrors = {
      PENDING: "Pending appointment must be confirmed before check-in",
      CANCELLED: "Cancelled appointment cannot be checked in",
      NO_SHOW: "No-show appointment cannot be checked in",
      COMPLETED: "Appointment is already completed",
    };

    const error = new Error(
      statusErrors[appointment.status] ||
        `Cannot check in appointment with status ${appointment.status}`,
    );
    error.statusCode = 400;
    throw error;
  }

  // 3. Idempotent return if queue entry already exists
  if (appointment.queue) {
    return {
      appointment,
      queueEntry: appointment.queue,
    };
  }

  // 4. Create queue entry with WAITING status
  const result = await prisma.$transaction(async (tx) => {
    const queueEntry = await tx.queueEntry.upsert({
      where: {
        appointmentId,
      },
      update: {
        status: "WAITING",
        checkedInAt: new Date(),
      },
      create: {
        appointmentId,
        status: "WAITING",
        checkedInAt: new Date(),
      },
    });

    return {
      appointment,
      queueEntry,
    };
  });

  return result;
};

const callAppointment = async ({ organizationId, appointmentId }) => {
  // 1. Find appointment with tenant isolation
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId,
    },
    include: {
      queue: true,
    },
  });

  if (!appointment) {
    const error = new Error("Appointment not found in this organization");
    error.statusCode = 404;
    throw error;
  }

  // 2. Queue entry must exist
  if (!appointment.queue) {
    const error = new Error(
      "Appointment must be checked in before it can be called",
    );
    error.statusCode = 400;
    throw error;
  }

  // 3. Appointment must still be confirmed
  if (appointment.status !== "CONFIRMED") {
    const error = new Error(
      `Cannot call appointment with status ${appointment.status}`,
    );
    error.statusCode = 400;
    throw error;
  }

  // 4. Queue must currently be WAITING
  if (appointment.queue.status !== "WAITING") {
    const error = new Error(
      `Cannot call appointment with queue status ${appointment.queue.status}`,
    );
    error.statusCode = 400;
    throw error;
  }

  // 5. Change queue status to CALLED
  const queueEntry = await prisma.queueEntry.update({
    where: {
      appointmentId,
    },
    data: {
      status: "CALLED",
      calledAt: new Date(),
    },
  });

  return {
    appointment,
    queueEntry,
  };
};

const startConsultation = async ({ organizationId, appointmentId }) => {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find appointment with tenant isolation
    const appointment = await tx.appointment.findFirst({
      where: {
        id: appointmentId,
        organizationId,
      },
      include: {
        queue: true,
        consultation: true,
      },
    });

    if (!appointment) {
      const error = new Error("Appointment not found in this organization");
      error.statusCode = 404;
      throw error;
    }

    // 2. Queue entry must exist
    if (!appointment.queue) {
      const error = new Error(
        "Appointment must be checked in before consultation can start",
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Appointment must be confirmed
    if (appointment.status !== "CONFIRMED") {
      const error = new Error(
        `Cannot start consultation for appointment with status ${appointment.status}`,
      );
      error.statusCode = 400;
      throw error;
    }

    // 4. Queue must be CALLED
    if (appointment.queue.status !== "CALLED") {
      const error = new Error(
        `Cannot start consultation with queue status ${appointment.queue.status}`,
      );
      error.statusCode = 400;
      throw error;
    }

    // 5. Prevent duplicate consultation
    if (appointment.consultation) {
      const error = new Error(
        "Consultation already exists for this appointment",
      );
      error.statusCode = 409;
      throw error;
    }

    const startedAt = new Date();

    // 6. Create consultation
    const consultation = await tx.consultation.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        organizationId: appointment.organizationId,
        startedAt,
      },
    });

    // 7. Move queue to IN_CONSULTATION
    const queueEntry = await tx.queueEntry.update({
      where: {
        appointmentId,
      },
      data: {
        status: "IN_CONSULTATION",
      },
    });

    return {
      appointment,
      consultation,
      queueEntry,
    };
  });

  return result;
};
module.exports = {
  checkInAppointment,
  callAppointment,
  startConsultation,
};
