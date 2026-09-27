const prisma = require("../../config/prisma");

const getAvailability = async (organizationId, doctorId, date) => {
  const requestedDate =
    date instanceof Date ? new Date(date.getTime()) : new Date(date);
  requestedDate.setUTCHours(0, 0, 0, 0);

  // Check doctor belongs to organization
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      organizationId,
      status: "ACTIVE",
    },
  });

  if (!doctor) {
    const error = new Error("Doctor not found in this organization");
    error.statusCode = 404;
    throw error;
  }

  // Get weekday (using UTC)
  const weekday = requestedDate.getUTCDay();

  // Get doctor's recurring schedule
  const schedules = await prisma.schedule.findMany({
    where: {
      doctorId,
      weekday,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  // Doctor does not work on this day
  if (schedules.length === 0) {
    return {
      date: requestedDate,
      doctorId,
      available: false,
      windows: [],
    };
  }

  // Check for a date-specific appointment window override
  const windowOverride = await prisma.appointmentWindow.findUnique({
    where: {
      doctorId_date: {
        doctorId,
        date: requestedDate,
      },
    },
  });

  const windows = schedules.map((schedule) => {
    let status = "OPEN";
    let startTime = schedule.startTime;
    let endTime = schedule.endTime;

    // Date-specific override
    if (windowOverride) {
      status = windowOverride.status;

      // If override has custom timings, use them
      if (windowOverride.startTime) {
        startTime = windowOverride.startTime;
      }

      if (windowOverride.endTime) {
        endTime = windowOverride.endTime;
      }
    }

    return {
      startTime,
      endTime,
      status,
      available: status === "OPEN",
    };
  });

  return {
    date: requestedDate,
    doctorId,
    doctorAvailabilityStatus: doctor.availabilityStatus,
    available: windows.some((window) => window.available),
    windows,
  };
};

module.exports = {
  getAvailability,
};