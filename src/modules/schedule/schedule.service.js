const prisma = require("../../config/prisma");

const createSchedule = async (organizationId, doctorId, data) => {
  // Check doctor
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

  // Check time range
  if (data.startTime >= data.endTime) {
    const error = new Error("End time must be after start time");
    error.statusCode = 400;
    throw error;
  }

  // Check overlapping schedule
  const overlappingSchedule = await prisma.schedule.findFirst({
    where: {
      doctorId,
      weekday: data.weekday,
      AND: [
        {
          startTime: {
            lt: data.endTime,
          },
        },
        {
          endTime: {
            gt: data.startTime,
          },
        },
      ],
    },
  });

  if (overlappingSchedule) {
    const error = new Error(
      "Doctor already has an overlapping schedule for this day",
    );
    error.statusCode = 409;
    throw error;
  }

  const schedule = await prisma.schedule.create({
    data: {
      doctorId,
      weekday: data.weekday,
      startTime: data.startTime,
      endTime: data.endTime,
    },
  });

  return schedule;
};

const getDoctorSchedules = async (organizationId, doctorId) => {
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

  return prisma.schedule.findMany({
    where: {
      doctorId,
    },
    orderBy: [
      {
        weekday: "asc",
      },
      {
        startTime: "asc",
      },
    ],
  });
};
const updateSchedule = async (organizationId, doctorId, scheduleId, data) => {
  // Check doctor belongs to organization
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

  // Check schedule belongs to this doctor
  const existingSchedule = await prisma.schedule.findFirst({
    where: {
      id: scheduleId,
      doctorId,
    },
  });

  if (!existingSchedule) {
    const error = new Error("Schedule not found");
    error.statusCode = 404;
    throw error;
  }

  // Calculate final values after update
  const weekday = data.weekday ?? existingSchedule.weekday;
  const startTime = data.startTime ?? existingSchedule.startTime;
  const endTime = data.endTime ?? existingSchedule.endTime;

  // Validate time range
  if (startTime >= endTime) {
    const error = new Error("End time must be after start time");
    error.statusCode = 400;
    throw error;
  }

  // Check overlapping schedule
  const overlappingSchedule = await prisma.schedule.findFirst({
    where: {
      doctorId,
      weekday,
      id: {
        not: scheduleId,
      },
      AND: [
        {
          startTime: {
            lt: endTime,
          },
        },
        {
          endTime: {
            gt: startTime,
          },
        },
      ],
    },
  });

  if (overlappingSchedule) {
    const error = new Error(
      "Doctor already has an overlapping schedule for this day",
    );
    error.statusCode = 409;
    throw error;
  }

  const updateData = {};
  if (data.weekday !== undefined) updateData.weekday = data.weekday;
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;

  const schedule = await prisma.schedule.update({
    where: {
      id: scheduleId,
    },
    data: updateData,
  });

  return schedule;
};
const deleteSchedule = async (organizationId, doctorId, scheduleId) => {
  // Check doctor belongs to organization
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

  // Check schedule belongs to this doctor
  const existingSchedule = await prisma.schedule.findFirst({
    where: {
      id: scheduleId,
      doctorId,
    },
  });

  if (!existingSchedule) {
    const error = new Error("Schedule not found");
    error.statusCode = 404;
    throw error;
  }

  await prisma.schedule.delete({
    where: {
      id: scheduleId,
    },
  });

  return {
    id: scheduleId,
  };
};
module.exports = {
  createSchedule,
  getDoctorSchedules,
  updateSchedule,
  deleteSchedule,
};
