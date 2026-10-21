const prisma = require("../../config/prisma");

/**
 * Creates a recurring doctor schedule.
 */
const createSchedule = async (organizationId, doctorId, data) => {
  // 1. Verify doctor exists in this organization
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

  // 2. Validate time range
  if (data.startTime >= data.endTime) {
    const error = new Error("End time must be after start time");
    error.statusCode = 400;
    throw error;
  }

  // 3. Detect overlapping schedule for the same doctor and weekday
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

  // 4. Create schedule
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

/**
 * Lists schedules for a doctor with optional weekday filtering and pagination.
 */
const getDoctorSchedules = async (organizationId, doctorId, query = {}) => {
  // 1. Verify doctor exists in this organization
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
  };

  if (query.weekday !== undefined && query.weekday !== null) {
    where.weekday = parseInt(query.weekday, 10);
  }

  if (query.page || query.limit) {
    const page = Math.max(1, parseInt(query.page || 1, 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || 20, 10)));
    const skip = (page - 1) * limit;

    const [total, schedules] = await Promise.all([
      prisma.schedule.count({ where }),
      prisma.schedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      }),
    ]);

    return {
      schedules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  const schedules = await prisma.schedule.findMany({
    where,
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });

  return schedules;
};

/**
 * Retrieves a single schedule by ID.
 */
const getScheduleById = async (organizationId, doctorId, scheduleId) => {
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

  const schedule = await prisma.schedule.findFirst({
    where: {
      id: scheduleId,
      doctorId,
    },
    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          organizationId: true,
        },
      },
    },
  });

  if (!schedule) {
    const error = new Error("Schedule not found");
    error.statusCode = 404;
    throw error;
  }

  return schedule;
};

/**
 * Updates an existing doctor schedule.
 */
const updateSchedule = async (organizationId, doctorId, scheduleId, data) => {
  // 1. Verify doctor belongs to organization
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

  // 2. Check schedule belongs to this doctor
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

  // 3. Calculate final values
  const weekday = data.weekday !== undefined ? data.weekday : existingSchedule.weekday;
  const startTime = data.startTime || existingSchedule.startTime;
  const endTime = data.endTime || existingSchedule.endTime;

  // 4. Validate time range
  if (startTime >= endTime) {
    const error = new Error("End time must be after start time");
    error.statusCode = 400;
    throw error;
  }

  // 5. Check overlapping schedule excluding current schedule
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

/**
 * Deletes a doctor schedule.
 * Does not silently delete or cancel existing appointments or appointment windows.
 */
const deleteSchedule = async (organizationId, doctorId, scheduleId) => {
  // 1. Check doctor belongs to organization
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

  // 2. Check schedule belongs to this doctor
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
  getScheduleById,
  updateSchedule,
  deleteSchedule,
};
