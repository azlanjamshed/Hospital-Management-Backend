const prisma = require("../../config/prisma");

const updateConsultation = async ({
  organizationId,
  consultationId,
  doctorId,
  data,
}) => {
  // 1. Find consultation with tenant isolation
  const consultation = await prisma.consultation.findFirst({
    where: {
      id: consultationId,
      organizationId,
    },
  });

  if (!consultation) {
    const error = new Error("Consultation not found in this organization");
    error.statusCode = 404;
    throw error;
  }

  // 2. Only the assigned doctor can update the consultation
  if (consultation.doctorId !== doctorId) {
    const error = new Error(
      "You are not authorized to update this consultation",
    );
    error.statusCode = 403;
    throw error;
  }

  // 3. Consultation must still be active
  if (consultation.completedAt) {
    const error = new Error("Completed consultation cannot be updated");
    error.statusCode = 400;
    throw error;
  }

  // 4. Update consultation
  const updatedConsultation = await prisma.consultation.update({
    where: {
      id: consultationId,
    },
    data,
  });

  return updatedConsultation;
};

const completeConsultation = async ({
  organizationId,
  consultationId,
  doctorId,
}) => {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find consultation with tenant isolation
    const consultation = await tx.consultation.findFirst({
      where: {
        id: consultationId,
        organizationId,
      },
      include: {
        appointment: {
          include: {
            queue: true,
          },
        },
      },
    });

    if (!consultation) {
      const error = new Error("Consultation not found in this organization");
      error.statusCode = 404;
      throw error;
    }

    // 2. Only assigned doctor can complete consultation
    if (consultation.doctorId !== doctorId) {
      const error = new Error(
        "You are not authorized to complete this consultation",
      );
      error.statusCode = 403;
      throw error;
    }

    // 3. Consultation cannot already be completed
    if (consultation.completedAt) {
      const error = new Error("Consultation is already completed");
      error.statusCode = 400;
      throw error;
    }

    // 4. Queue entry must exist
    if (!consultation.appointment.queue) {
      const error = new Error("Queue entry not found for this appointment");
      error.statusCode = 400;
      throw error;
    }

    // 5. Queue must currently be IN_CONSULTATION
    if (consultation.appointment.queue.status !== "IN_CONSULTATION") {
      const error = new Error(
        `Cannot complete consultation with queue status ${consultation.appointment.queue.status}`,
      );
      error.statusCode = 400;
      throw error;
    }

    // 6. Appointment must still be CONFIRMED
    if (consultation.appointment.status !== "CONFIRMED") {
      const error = new Error(
        `Cannot complete consultation for appointment with status ${consultation.appointment.status}`,
      );
      error.statusCode = 400;
      throw error;
    }

    const completedAt = new Date();

    // 7. Complete consultation
    const updatedConsultation = await tx.consultation.update({
      where: {
        id: consultationId,
      },
      data: {
        completedAt,
      },
    });

    // 8. Complete queue entry
    const queueEntry = await tx.queueEntry.update({
      where: {
        appointmentId: consultation.appointmentId,
      },
      data: {
        status: "COMPLETED",
        completedAt,
      },
    });

    // 9. Complete appointment
    const appointment = await tx.appointment.update({
      where: {
        id: consultation.appointmentId,
      },
      data: {
        status: "COMPLETED",
      },
    });

    return {
      consultation: updatedConsultation,
      queueEntry,
      appointment,
    };
  });

  return result;
};
const getConsultation = async ({ organizationId, consultationId }) => {
  const consultation = await prisma.consultation.findFirst({
    where: {
      id: consultationId,
      organizationId,
    },
    include: {
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
      appointment: {
        select: {
          id: true,
          appointmentDate: true,
          tokenNumber: true,
          patientType: true,
          source: true,
          status: true,
        },
      },
    },
  });

  if (!consultation) {
    const error = new Error("Consultation not found in this organization");
    error.statusCode = 404;
    throw error;
  }

  return consultation;
};
module.exports = {
  updateConsultation,
  completeConsultation,
  getConsultation,
};
