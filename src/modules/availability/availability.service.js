const prisma = require("../../config/prisma");

/**
 * Returns date-specific availability for a doctor.
 */
const getAvailability = async (organizationId, doctorId, date) => {
  // 1. Verify organization exists
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Normalize requested date to UTC midnight
  const requestedDate =
    date instanceof Date ? new Date(date.getTime()) : new Date(date);

  if (Number.isNaN(requestedDate.getTime())) {
    const error = new Error("Valid date is required");
    error.statusCode = 400;
    throw error;
  }
  requestedDate.setUTCHours(0, 0, 0, 0);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const isPast = requestedDate < today;

  // 3. Find doctor in organization with department associations
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      organizationId,
    },
    include: {
      departments: {
        include: {
          department: true,
        },
      },
    },
  });

  if (!doctor) {
    const error = new Error("Doctor not found in this organization");
    error.statusCode = 404;
    throw error;
  }

  // 4. Retrieve doctor's recurring schedule for this weekday (UTC)
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

  // 5. Retrieve date-specific appointment window override if exists
  const appointmentWindow = await prisma.appointmentWindow.findUnique({
    where: {
      doctorId_date: {
        doctorId,
        date: requestedDate,
      },
    },
  });

  // 6. Count active appointments consuming capacity for this doctor and date
  // Active appointments = status not in [CANCELLED, NO_SHOW]
  // (Both PENDING and CONFIRMED consume capacity per domain lifecycle rules)
  const dayStart = new Date(requestedDate);
  const dayEnd = new Date(requestedDate);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const activeCount = await prisma.appointment.count({
    where: {
      doctorId,
      organizationId,
      appointmentDate: {
        gte: dayStart,
        lt: dayEnd,
      },
      status: {
        notIn: ["CANCELLED", "NO_SHOW"],
      },
    },
  });

  // 7. Calculate availability and remaining capacity
  let isAvailable = true;
  let reason = null;

  if (isPast) {
    isAvailable = false;
    reason = "Cannot check availability for past dates";
  } else if (doctor.status !== "ACTIVE") {
    isAvailable = false;
    reason = "Doctor is inactive";
  } else if (doctor.availabilityStatus !== "AVAILABLE") {
    isAvailable = false;
    reason = `Doctor is currently ${doctor.availabilityStatus}`;
  } else if (schedules.length === 0) {
    isAvailable = false;
    reason = "Doctor has no recurring schedule on this day";
  } else if (appointmentWindow?.status === "CLOSED") {
    isAvailable = false;
    reason = "Appointment booking is closed for this date";
  } else if (appointmentWindow?.status === "FULL") {
    isAvailable = false;
    reason = "Appointment window is full for this date";
  } else if (
    appointmentWindow?.capacity != null &&
    activeCount >= appointmentWindow.capacity
  ) {
    isAvailable = false;
    reason = "Appointment window has reached maximum capacity";
  }

  const capacity = appointmentWindow?.capacity ?? null;
  const remainingCapacity =
    capacity != null ? Math.max(0, capacity - activeCount) : null;

  const startTime =
    appointmentWindow?.startTime || schedules[0]?.startTime || null;
  const endTime =
    appointmentWindow?.endTime ||
    schedules[schedules.length - 1]?.endTime ||
    null;

  // 8. Construct windows array (compatible with existing /api/availability format)
  const windows =
    schedules.length > 0
      ? schedules.map((sched) => {
          const wStartTime = appointmentWindow?.startTime || sched.startTime;
          const wEndTime = appointmentWindow?.endTime || sched.endTime;
          const wStatus = appointmentWindow?.status || "OPEN";
          const wCapacity = appointmentWindow?.capacity ?? null;
          const wRemaining =
            wCapacity != null ? Math.max(0, wCapacity - activeCount) : null;
          const wAvailable =
            isAvailable &&
            wStatus === "OPEN" &&
            (wRemaining === null || wRemaining > 0);

          return {
            startTime: wStartTime,
            endTime: wEndTime,
            status: wStatus,
            capacity: wCapacity,
            appointmentCount: activeCount,
            remainingCapacity: wRemaining,
            available: wAvailable,
          };
        })
      : [];

  return {
    available: isAvailable,
    date: requestedDate,
    doctor: {
      id: doctor.id,
      name: doctor.name,
      qualification: doctor.qualification,
      consultationFeeMinor: doctor.consultationFeeMinor,
      status: doctor.status,
      availabilityStatus: doctor.availabilityStatus,
      organizationId: doctor.organizationId,
      departments:
        doctor.departments?.map((d) => ({
          id: d.department.id,
          name: d.department.name,
        })) || [],
    },
    doctorId: doctor.id,
    doctorAvailabilityStatus: doctor.availabilityStatus,
    startTime,
    endTime,
    capacity,
    appointmentCount: activeCount,
    remainingCapacity,
    schedules,
    appointmentWindow: appointmentWindow || null,
    windows,
    reason: isAvailable ? null : reason,
  };
};

/**
 * Lists available doctors within an organization for a requested date and filters.
 */
const listAvailableDoctors = async (organizationId, query = {}) => {
  // 1. Verify organization exists
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Normalize requested date to UTC midnight
  const requestedDate =
    query.date instanceof Date ? new Date(query.date.getTime()) : new Date(query.date);

  if (Number.isNaN(requestedDate.getTime())) {
    const error = new Error("Valid date is required");
    error.statusCode = 400;
    throw error;
  }
  requestedDate.setUTCHours(0, 0, 0, 0);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const isPast = requestedDate < today;
  const weekday = requestedDate.getUTCDay();

  // 3. Build doctor search filter
  const where = {
    organizationId,
    status: "ACTIVE",
  };

  if (query.departmentId) {
    where.departments = {
      some: {
        departmentId: query.departmentId,
      },
    };
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { qualification: { contains: query.search, mode: "insensitive" } },
    ];
  }

  // 4. Retrieve matching doctors with weekday schedule and date-specific window
  const doctors = await prisma.doctor.findMany({
    where,
    include: {
      departments: {
        include: {
          department: true,
        },
      },
      schedules: {
        where: {
          weekday,
        },
        orderBy: {
          startTime: "asc",
        },
      },
      appointmentWindows: {
        where: {
          date: requestedDate,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // 5. Query active appointment counts in batch for all doctors on this date
  const dayStart = new Date(requestedDate);
  const dayEnd = new Date(requestedDate);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const activeCounts = await prisma.appointment.groupBy({
    by: ["doctorId"],
    where: {
      organizationId,
      appointmentDate: {
        gte: dayStart,
        lt: dayEnd,
      },
      status: {
        notIn: ["CANCELLED", "NO_SHOW"],
      },
    },
    _count: {
      id: true,
    },
  });

  const activeCountMap = new Map();
  for (const item of activeCounts) {
    activeCountMap.set(item.doctorId, item._count.id);
  }

  // 6. Evaluate availability and capacity for each doctor
  const evaluatedDoctors = doctors.map((doc) => {
    const scheds = doc.schedules || [];
    const win = doc.appointmentWindows?.[0] || null;
    const activeCount = activeCountMap.get(doc.id) || 0;

    let isDocAvailable = true;
    let reason = null;

    if (isPast) {
      isDocAvailable = false;
      reason = "Cannot check availability for past dates";
    } else if (doc.status !== "ACTIVE") {
      isDocAvailable = false;
      reason = "Doctor is inactive";
    } else if (doc.availabilityStatus !== "AVAILABLE") {
      isDocAvailable = false;
      reason = `Doctor is currently ${doc.availabilityStatus}`;
    } else if (scheds.length === 0) {
      isDocAvailable = false;
      reason = "Doctor has no recurring schedule on this day";
    } else if (win?.status === "CLOSED") {
      isDocAvailable = false;
      reason = "Appointment booking is closed for this date";
    } else if (win?.status === "FULL") {
      isDocAvailable = false;
      reason = "Appointment window is full for this date";
    } else if (win?.capacity != null && activeCount >= win.capacity) {
      isDocAvailable = false;
      reason = "Appointment window has reached maximum capacity";
    }

    const capacity = win?.capacity ?? null;
    const remainingCapacity =
      capacity != null ? Math.max(0, capacity - activeCount) : null;
    const startTime = win?.startTime || scheds[0]?.startTime || null;
    const endTime =
      win?.endTime || scheds[scheds.length - 1]?.endTime || null;

    const windows =
      scheds.length > 0
        ? scheds.map((sched) => {
            const wStartTime = win?.startTime || sched.startTime;
            const wEndTime = win?.endTime || sched.endTime;
            const wStatus = win?.status || "OPEN";
            const wCapacity = win?.capacity ?? null;
            const wRemaining =
              wCapacity != null ? Math.max(0, wCapacity - activeCount) : null;
            const wAvailable =
              isDocAvailable &&
              wStatus === "OPEN" &&
              (wRemaining === null || wRemaining > 0);

            return {
              startTime: wStartTime,
              endTime: wEndTime,
              status: wStatus,
              capacity: wCapacity,
              appointmentCount: activeCount,
              remainingCapacity: wRemaining,
              available: wAvailable,
            };
          })
        : [];

    return {
      id: doc.id,
      name: doc.name,
      qualification: doc.qualification,
      consultationFeeMinor: doc.consultationFeeMinor,
      status: doc.status,
      availabilityStatus: doc.availabilityStatus,
      organizationId: doc.organizationId,
      departments:
        doc.departments?.map((d) => ({
          id: d.department.id,
          name: d.department.name,
        })) || [],
      available: isDocAvailable,
      reason: isDocAvailable ? null : reason,
      startTime,
      endTime,
      capacity,
      appointmentCount: activeCount,
      remainingCapacity,
      schedules: scheds,
      appointmentWindow: win,
      windows,
    };
  });

  // 7. Optional filter by availableOnly
  let results = evaluatedDoctors;
  if (query.availableOnly === true || query.availableOnly === "true") {
    results = evaluatedDoctors.filter((d) => d.available);
  }

  // 8. Optional pagination
  if (query.page || query.limit) {
    const page = parseInt(query.page || 1, 10);
    const limit = parseInt(query.limit || 10, 10);
    const total = results.length;
    const paginated = results.slice((page - 1) * limit, page * limit);

    return {
      doctors: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      date: requestedDate,
    };
  }

  return {
    doctors: results,
    total: results.length,
    date: requestedDate,
  };
};

module.exports = {
  getAvailability,
  getDoctorAvailability: getAvailability,
  listAvailableDoctors,
};