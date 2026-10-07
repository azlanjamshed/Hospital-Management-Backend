const prisma = require("../../config/prisma");

const getDoctorAvailability = async (organizationId, doctorId, date) => {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      organizationId,
      status: "ACTIVE",
    },
  });

  if (!doctor) {
    const error = new Error("Doctor not found");
    error.statusCode = 404;
    throw error;
  }
  if (doctor.availabilityStatus !== "AVAILABLE") {
    return {
      doctor,
      date,
      available: false,
      startTime: null,
      endTime: null,
      capacity: null,
      appointmentCount: 0,
      remainingCapacity: 0,
      schedules: [],
      appointmentWindow: null,
    };
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const requestedDate = new Date(date);
  requestedDate.setUTCHours(0, 0, 0, 0);

  if (requestedDate < today) {
    return {
      doctor,
      date,
      available: false,
      startTime: null,
      endTime: null,
      capacity: null,
      appointmentCount: 0,
      remainingCapacity: 0,
      schedules: [],
      appointmentWindow: null,
    };
  }

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
  const appointmentWindow = await prisma.appointmentWindow.findUnique({
    where: {
      doctorId_date: {
        doctorId,
        date: new Date(
          Date.UTC(
            requestedDate.getUTCFullYear(),
            requestedDate.getUTCMonth(),
            requestedDate.getUTCDate(),
          ),
        ),
      },
    },
  });

  const dayStart = new Date(
    Date.UTC(
      requestedDate.getUTCFullYear(),
      requestedDate.getUTCMonth(),
      requestedDate.getUTCDate(),
    ),
  );

  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      organizationId,
      appointmentDate: {
        gte: dayStart,
        lt: dayEnd,
      },
      //   status: {
      //     in: ["PENDING", "CONFIRMED"],
      //   },

      status: "CONFIRMED",
    },
    select: {
      id: true,
      appointmentDate: true,
      status: true,
      tokenNumber: true,
    },
    orderBy: {
      appointmentDate: "asc",
    },
  });

  const appointmentCount = appointments.length;

  const remainingCapacity =
    appointmentWindow?.capacity != null
      ? Math.max(appointmentWindow.capacity - appointmentCount, 0)
      : null;

  if (
    appointmentWindow?.status === "CLOSED" ||
    appointmentWindow?.status === "FULL"
  ) {
    return {
      doctor,
      date,
      available: false,
      startTime: null,
      endTime: null,
      capacity: appointmentWindow?.capacity ?? null,
      appointmentCount,
      remainingCapacity,
      schedules,
      appointmentWindow,
    };
  }

  const schedule = schedules[0] || null;

  if (!schedule) {
    return {
      doctor,
      date,
      available: false,
      startTime: null,
      endTime: null,
      capacity: null,
      appointmentCount: 0,
      remainingCapacity: 0,
      schedules,
      appointmentWindow,
    };
  }
  const effectiveStartTime = appointmentWindow?.startTime || schedule.startTime;

  const effectiveEndTime = appointmentWindow?.endTime || schedule.endTime;

  return {
    doctor,
    date,
    available: remainingCapacity === null || remainingCapacity > 0,

    startTime: effectiveStartTime,
    endTime: effectiveEndTime,

    capacity: appointmentWindow?.capacity ?? null,
    appointmentCount,
    remainingCapacity,

    schedules,
    appointmentWindow,
  };
};

module.exports = {
  getDoctorAvailability,
};
