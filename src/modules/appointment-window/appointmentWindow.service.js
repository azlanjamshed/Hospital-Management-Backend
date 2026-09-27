const prisma = require("../../config/prisma");

const createOrUpdateAppointmentWindow = async (
  organizationId,
  doctorId,
  data
) => {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      organizationId,
    },
  });

  if (!doctor) {
    const error = new Error("Doctor not found in this organization");
    error.statusCode = 404;
    throw error;
  }

  const windowDate = new Date(data.date);
  windowDate.setUTCHours(0, 0, 0, 0);

  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    const error = new Error("End time must be after start time");
    error.statusCode = 400;
    throw error;
  }

  const window = await prisma.appointmentWindow.upsert({
    where: {
      doctorId_date: {
        doctorId,
        date: windowDate,
      },
    },
    update: {
      startTime: data.startTime,
      endTime: data.endTime,
      capacity: data.capacity,
      status: data.status,
    },
    create: {
      organizationId,
      doctorId,
      date: windowDate,
      startTime: data.startTime,
      endTime: data.endTime,
      capacity: data.capacity,
      status: data.status || "OPEN",
    },
  });

  return window;
};

const getDoctorAppointmentWindows = async (
  organizationId,
  doctorId,
  query = {}
) => {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      organizationId,
    },
  });

  if (!doctor) {
    const error = new Error("Doctor not found in this organization");
    error.statusCode = 404;
    throw error;
  }

  const where = {
    doctorId,
    organizationId,
  };

  if (query.startDate) {
    const start = new Date(query.startDate);
    start.setUTCHours(0, 0, 0, 0);
    where.date = { ...where.date, gte: start };
  }

  if (query.endDate) {
    const end = new Date(query.endDate);
    end.setUTCHours(23, 59, 59, 999);
    where.date = { ...where.date, lte: end };
  }

  return prisma.appointmentWindow.findMany({
    where,
    orderBy: {
      date: "asc",
    },
  });
};

module.exports = {
  createOrUpdateAppointmentWindow,
  getDoctorAppointmentWindows,
};
