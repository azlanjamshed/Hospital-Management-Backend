const prisma = require("../../config/prisma");

/**
 * Creates or upserts a date-specific appointment window.
 */
const createOrUpdateAppointmentWindow = async (
  organizationId,
  doctorId,
  data,
) => {
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

  // 2. Validate and normalize date to UTC midnight
  const windowDate = new Date(data.date);
  if (Number.isNaN(windowDate.getTime())) {
    const error = new Error("Valid date is required");
    error.statusCode = 400;
    throw error;
  }
  windowDate.setUTCHours(0, 0, 0, 0);

  // 3. Validate time range if provided
  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    const error = new Error("End time must be after start time");
    error.statusCode = 400;
    throw error;
  }

  // 4. Concurrency-safe atomic transaction
  return await prisma.$transaction(
    async (tx) => {
      const existingWindow = await tx.appointmentWindow.findUnique({
        where: {
          doctorId_date: {
            doctorId,
            date: windowDate,
          },
        },
      });

      if (existingWindow) {
        // Lock the row to serialize capacity and status updates
        await tx.$queryRaw`
          SELECT "id"
          FROM "AppointmentWindow"
          WHERE "id" = ${existingWindow.id}
          FOR UPDATE
        `;

        // Count active bookings for this window
        const activeCount = await tx.appointment.count({
          where: {
            organizationId,
            doctorId,
            appointmentDate: windowDate,
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
          },
        });

        // Prevent reducing capacity below current active bookings
        if (
          data.capacity !== undefined &&
          data.capacity !== null &&
          data.capacity < activeCount
        ) {
          const error = new Error(
            `Cannot reduce capacity to ${data.capacity}. There are currently ${activeCount} active appointments for this window.`,
          );
          error.statusCode = 409;
          throw error;
        }

        // Determine effective capacity and status
        const effectiveCapacity =
          data.capacity !== undefined
            ? data.capacity
            : existingWindow.capacity;

        let targetStatus =
          data.status !== undefined ? data.status : existingWindow.status;

        if (
          data.status === "OPEN" &&
          effectiveCapacity &&
          activeCount >= effectiveCapacity
        ) {
          const error = new Error(
            "Cannot set status to OPEN because active bookings have already reached capacity",
          );
          error.statusCode = 409;
          throw error;
        }

        if (data.status === undefined) {
          if (
            targetStatus === "FULL" &&
            effectiveCapacity &&
            activeCount < effectiveCapacity
          ) {
            targetStatus = "OPEN";
          } else if (
            targetStatus === "OPEN" &&
            effectiveCapacity &&
            activeCount >= effectiveCapacity
          ) {
            targetStatus = "FULL";
          }
        }

        const updated = await tx.appointmentWindow.update({
          where: { id: existingWindow.id },
          data: {
            ...(data.startTime !== undefined && { startTime: data.startTime }),
            ...(data.endTime !== undefined && { endTime: data.endTime }),
            ...(data.capacity !== undefined && { capacity: data.capacity }),
            status: targetStatus,
          },
        });

        return {
          ...updated,
          activeBookingsCount: activeCount,
        };
      }

      // Check if there are existing appointments created on this date without a window
      const activeCount = await tx.appointment.count({
        where: {
          organizationId,
          doctorId,
          appointmentDate: windowDate,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
      });

      if (
        data.capacity !== undefined &&
        data.capacity !== null &&
        data.capacity < activeCount
      ) {
        const error = new Error(
          `Cannot create window with capacity ${data.capacity}. There are currently ${activeCount} active appointments on this date.`,
        );
        error.statusCode = 409;
        throw error;
      }

      let initialStatus = data.status || "OPEN";
      if (
        initialStatus === "OPEN" &&
        data.capacity &&
        activeCount >= data.capacity
      ) {
        initialStatus = "FULL";
      }

      const newWindow = await tx.appointmentWindow.create({
        data: {
          organizationId,
          doctorId,
          date: windowDate,
          startTime: data.startTime,
          endTime: data.endTime,
          capacity: data.capacity,
          status: initialStatus,
        },
      });

      // Link any existing appointments for this doctor and date to the new window
      await tx.appointment.updateMany({
        where: {
          organizationId,
          doctorId,
          appointmentDate: windowDate,
          appointmentWindowId: null,
        },
        data: {
          appointmentWindowId: newWindow.id,
        },
      });

      return {
        ...newWindow,
        activeBookingsCount: activeCount,
      };
    },
    {
      maxWait: 10000,
      timeout: 15000,
    },
  );
};

/**
 * Retrieves windows for a doctor with date range and status filters.
 */
const getDoctorAppointmentWindows = async (
  organizationId,
  doctorId,
  query = {},
) => {
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

  // 2. Build filter conditions
  const where = {
    doctorId,
    organizationId,
  };

  if (query.startDate) {
    const start = new Date(query.startDate);
    start.setUTCHours(0, 0, 0, 0);
    where.date = {
      ...where.date,
      gte: start,
    };
  }

  if (query.endDate) {
    const end = new Date(query.endDate);
    end.setUTCHours(23, 59, 59, 999);
    where.date = {
      ...where.date,
      lte: end,
    };
  }

  if (query.status) {
    where.status = query.status;
  }

  // 3. Handle optional pagination
  if (query.page || query.limit) {
    const page = parseInt(query.page || 1, 10);
    const limit = parseInt(query.limit || 10, 10);
    const skip = (page - 1) * limit;

    const [total, windows] = await Promise.all([
      prisma.appointmentWindow.count({ where }),
      prisma.appointmentWindow.findMany({
        where,
        orderBy: { date: "asc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              appointments: {
                where: { status: { notIn: ["CANCELLED", "NO_SHOW"] } },
              },
            },
          },
        },
      }),
    ]);

    const formatted = windows.map((w) => ({
      ...w,
      activeBookingsCount: w._count?.appointments || 0,
    }));

    return {
      windows: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // If no pagination requested, return array of windows directly
  const windows = await prisma.appointmentWindow.findMany({
    where,
    orderBy: {
      date: "asc",
    },
    include: {
      _count: {
        select: {
          appointments: {
            where: { status: { notIn: ["CANCELLED", "NO_SHOW"] } },
          },
        },
      },
    },
  });

  return windows.map((w) => ({
    ...w,
    activeBookingsCount: w._count?.appointments || 0,
  }));
};

/**
 * Retrieves a single appointment window by ID.
 */
const getAppointmentWindowById = async (
  organizationId,
  doctorId,
  windowId,
) => {
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

  // 2. Fetch window
  const window = await prisma.appointmentWindow.findFirst({
    where: {
      id: windowId,
      doctorId,
      organizationId,
    },
    include: {
      _count: {
        select: {
          appointments: {
            where: { status: { notIn: ["CANCELLED", "NO_SHOW"] } },
          },
        },
      },
      appointments: {
        select: {
          id: true,
          tokenNumber: true,
          status: true,
          patientId: true,
          appointmentDate: true,
          createdAt: true,
        },
        orderBy: {
          tokenNumber: "asc",
        },
      },
    },
  });

  if (!window) {
    const error = new Error("Appointment window not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    ...window,
    activeBookingsCount: window._count?.appointments || 0,
  };
};

/**
 * Updates an appointment window (capacity, times, status).
 */
const updateAppointmentWindow = async (
  organizationId,
  doctorId,
  windowId,
  data,
) => {
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

  // 2. Atomic transaction with row locking
  return await prisma.$transaction(
    async (tx) => {
      const window = await tx.appointmentWindow.findFirst({
        where: {
          id: windowId,
          doctorId,
          organizationId,
        },
      });

      if (!window) {
        const error = new Error("Appointment window not found");
        error.statusCode = 404;
        throw error;
      }

      // Lock row
      await tx.$queryRaw`
        SELECT "id"
        FROM "AppointmentWindow"
        WHERE "id" = ${windowId}
        FOR UPDATE
      `;

      // Validate time range with effective values
      const effectiveStartTime =
        data.startTime !== undefined ? data.startTime : window.startTime;
      const effectiveEndTime =
        data.endTime !== undefined ? data.endTime : window.endTime;

      if (
        effectiveStartTime &&
        effectiveEndTime &&
        effectiveStartTime >= effectiveEndTime
      ) {
        const error = new Error("End time must be after start time");
        error.statusCode = 400;
        throw error;
      }

      // Count active bookings for this window
      const activeCount = await tx.appointment.count({
        where: {
          appointmentWindowId: windowId,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
      });

      // Prevent reducing capacity below active bookings
      if (
        data.capacity !== undefined &&
        data.capacity !== null &&
        data.capacity < activeCount
      ) {
        const error = new Error(
          `Cannot reduce capacity to ${data.capacity}. There are currently ${activeCount} active appointments for this window.`,
        );
        error.statusCode = 409;
        throw error;
      }

      const effectiveCapacity =
        data.capacity !== undefined ? data.capacity : window.capacity;

      let targetStatus =
        data.status !== undefined ? data.status : window.status;

      if (
        data.status === "OPEN" &&
        effectiveCapacity &&
        activeCount >= effectiveCapacity
      ) {
        const error = new Error(
          "Cannot set status to OPEN because active bookings have already reached capacity",
        );
        error.statusCode = 409;
        throw error;
      }

      if (data.status === undefined) {
        if (
          targetStatus === "FULL" &&
          effectiveCapacity &&
          activeCount < effectiveCapacity
        ) {
          targetStatus = "OPEN";
        } else if (
          targetStatus === "OPEN" &&
          effectiveCapacity &&
          activeCount >= effectiveCapacity
        ) {
          targetStatus = "FULL";
        }
      }

      const updated = await tx.appointmentWindow.update({
        where: { id: windowId },
        data: {
          ...(data.startTime !== undefined && { startTime: data.startTime }),
          ...(data.endTime !== undefined && { endTime: data.endTime }),
          ...(data.capacity !== undefined && { capacity: data.capacity }),
          ...(targetStatus !== undefined && { status: targetStatus }),
        },
      });

      return {
        ...updated,
        activeBookingsCount: activeCount,
      };
    },
    {
      maxWait: 10000,
      timeout: 15000,
    },
  );
};

/**
 * Updates status of an appointment window (OPEN / CLOSED / FULL).
 */
const updateAppointmentWindowStatus = async (
  organizationId,
  doctorId,
  windowId,
  status,
) => {
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

  // 2. Atomic transaction with row locking
  return await prisma.$transaction(
    async (tx) => {
      const window = await tx.appointmentWindow.findFirst({
        where: {
          id: windowId,
          doctorId,
          organizationId,
        },
      });

      if (!window) {
        const error = new Error("Appointment window not found");
        error.statusCode = 404;
        throw error;
      }

      // Lock row
      await tx.$queryRaw`
        SELECT "id"
        FROM "AppointmentWindow"
        WHERE "id" = ${windowId}
        FOR UPDATE
      `;

      const activeCount = await tx.appointment.count({
        where: {
          appointmentWindowId: windowId,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
      });

      if (
        status === "OPEN" &&
        window.capacity &&
        activeCount >= window.capacity
      ) {
        const error = new Error(
          "Cannot set status to OPEN because active bookings have already reached capacity",
        );
        error.statusCode = 409;
        throw error;
      }

      const updated = await tx.appointmentWindow.update({
        where: { id: windowId },
        data: { status },
      });

      return {
        ...updated,
        activeBookingsCount: activeCount,
      };
    },
    {
      maxWait: 10000,
      timeout: 15000,
    },
  );
};

/**
 * Safely deletes an appointment window.
 * Rejects if there are active bookings with 409 Conflict.
 * Preserves historical (cancelled/no_show) appointments by unlinking them.
 */
const deleteAppointmentWindow = async (
  organizationId,
  doctorId,
  windowId,
) => {
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

  // 2. Atomic transaction with row locking
  return await prisma.$transaction(
    async (tx) => {
      const window = await tx.appointmentWindow.findFirst({
        where: {
          id: windowId,
          doctorId,
          organizationId,
        },
      });

      if (!window) {
        const error = new Error("Appointment window not found");
        error.statusCode = 404;
        throw error;
      }

      // Lock row
      await tx.$queryRaw`
        SELECT "id"
        FROM "AppointmentWindow"
        WHERE "id" = ${windowId}
        FOR UPDATE
      `;

      // Check for active appointments
      const activeCount = await tx.appointment.count({
        where: {
          appointmentWindowId: windowId,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
      });

      if (activeCount > 0) {
        const error = new Error(
          `Cannot delete appointment window with ${activeCount} active appointment(s). Cancel or reschedule appointments before deleting.`,
        );
        error.statusCode = 409;
        throw error;
      }

      // Safely unlink non-active appointments (e.g. CANCELLED, NO_SHOW) so historical clinical records are preserved
      await tx.appointment.updateMany({
        where: {
          appointmentWindowId: windowId,
        },
        data: {
          appointmentWindowId: null,
        },
      });

      // Delete the appointment window
      await tx.appointmentWindow.delete({
        where: { id: windowId },
      });

      return {
        id: windowId,
        deleted: true,
      };
    },
    {
      maxWait: 10000,
      timeout: 15000,
    },
  );
};

module.exports = {
  createOrUpdateAppointmentWindow,
  getDoctorAppointmentWindows,
  getAppointmentWindowById,
  updateAppointmentWindow,
  updateAppointmentWindowStatus,
  deleteAppointmentWindow,
};
