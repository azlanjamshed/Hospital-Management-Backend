const bcrypt = require("bcryptjs");
const prisma = require("../../config/prisma");

/**
 * Creates a doctor account, doctor profile, and department associations in a transaction.
 */
const createDoctor = async (organizationId, data) => {
  // 1. Verify organization exists
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  const email = data.email.trim().toLowerCase();
  const phone = data.phone ? data.phone.trim() : null;

  // 2. Check whether email or phone already belongs to a user
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        phone ? { phone } : undefined,
      ].filter(Boolean),
    },
  });

  if (existingUser) {
    const error = new Error(
      existingUser.email === email
        ? "A user with this email already exists"
        : "A user with this phone number already exists",
    );
    error.statusCode = 409;
    throw error;
  }

  // 3. If registration number is provided, check uniqueness within this organization
  if (data.registrationNumber) {
    const registrationNumber = data.registrationNumber.trim();
    const existingDoctor = await prisma.doctor.findFirst({
      where: {
        organizationId,
        registrationNumber,
      },
    });

    if (existingDoctor) {
      const error = new Error(
        "A doctor with this registration number already exists",
      );
      error.statusCode = 409;
      throw error;
    }
  }

  // 4. Verify departments belong to this organization
  const departmentIds = data.departmentIds || [];
  if (departmentIds.length > 0) {
    const departments = await prisma.department.findMany({
      where: {
        id: { in: departmentIds },
        organizationId,
      },
    });

    if (departments.length !== departmentIds.length) {
      const error = new Error(
        "One or more departments do not belong to this organization",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // 5. Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // 6. Create User + Doctor + Department relationships in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name.trim(),
        email,
        phone,
        passwordHash,
        role: "DOCTOR",
        tokenVersion: 0,
      },
    });

    const doctor = await tx.doctor.create({
      data: {
        organizationId,
        userId: user.id,
        name: data.name.trim(),
        qualification: data.qualification ? data.qualification.trim() : null,
        registrationNumber: data.registrationNumber
          ? data.registrationNumber.trim()
          : null,
        consultationFeeMinor: data.consultationFeeMinor,
      },
    });

    if (departmentIds.length > 0) {
      await tx.doctorDepartment.createMany({
        data: departmentIds.map((departmentId) => ({
          doctorId: doctor.id,
          departmentId,
        })),
      });
    }

    return {
      user,
      doctor,
    };
  });

  return result;
};

/**
 * Retrieves doctors for an organization with optional pagination and filters.
 */
const getDoctors = async (organizationId, query = {}) => {
  const page = query.page ? Math.max(1, parseInt(query.page, 10)) : 1;
  const limit = query.limit ? Math.min(100, Math.max(1, parseInt(query.limit, 10))) : 20;
  const skip = (page - 1) * limit;

  const where = {
    organizationId,
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.departmentId) {
    where.departments = {
      some: {
        departmentId: query.departmentId,
      },
    };
  }

  if (query.search) {
    const search = query.search.trim();
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { registrationNumber: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { phone: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, doctors] = await Promise.all([
    prisma.doctor.count({ where }),
    prisma.doctor.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        departments: {
          include: {
            department: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return {
    doctors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a doctor by ID scoped to the organization.
 */
const getDoctorById = async (organizationId, doctorId) => {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      organizationId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      departments: {
        include: {
          department: true,
        },
      },
      schedules: true,
    },
  });

  if (!doctor) {
    const error = new Error("Doctor not found");
    error.statusCode = 404;
    throw error;
  }

  return doctor;
};

/**
 * Updates permitted doctor fields and department assignments.
 */
const updateDoctor = async (organizationId, doctorId, data) => {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      organizationId,
    },
    include: {
      user: true,
    },
  });

  if (!doctor) {
    const error = new Error("Doctor not found");
    error.statusCode = 404;
    throw error;
  }

  // Registration number uniqueness check
  if (
    data.registrationNumber &&
    data.registrationNumber !== doctor.registrationNumber
  ) {
    const duplicate = await prisma.doctor.findFirst({
      where: {
        organizationId,
        registrationNumber: data.registrationNumber.trim(),
        NOT: { id: doctorId },
      },
    });

    if (duplicate) {
      const error = new Error(
        "A doctor with this registration number already exists",
      );
      error.statusCode = 409;
      throw error;
    }
  }

  // Phone uniqueness check
  if (
    data.phone !== undefined &&
    doctor.user &&
    data.phone !== doctor.user.phone
  ) {
    const phone = data.phone ? data.phone.trim() : null;
    if (phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: doctor.user.id },
        },
      });

      if (existingUser) {
        const error = new Error(
          "A user with this phone number already exists",
        );
        error.statusCode = 409;
        throw error;
      }
    }
  }

  // Department assignment verification
  if (data.departmentIds && data.departmentIds.length > 0) {
    const departments = await prisma.department.findMany({
      where: {
        id: { in: data.departmentIds },
        organizationId,
      },
    });

    if (departments.length !== data.departmentIds.length) {
      const error = new Error(
        "One or more departments do not belong to this organization",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update user info if name or phone changed
    if (doctor.user && (data.name !== undefined || data.phone !== undefined)) {
      await tx.user.update({
        where: { id: doctor.user.id },
        data: {
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(data.phone !== undefined && {
            phone: data.phone ? data.phone.trim() : null,
          }),
        },
      });
    }

    // 2. Update doctor profile
    const doctorUpdateData = {};
    if (data.name !== undefined) doctorUpdateData.name = data.name.trim();
    if (data.qualification !== undefined)
      doctorUpdateData.qualification = data.qualification
        ? data.qualification.trim()
        : null;
    if (data.registrationNumber !== undefined)
      doctorUpdateData.registrationNumber = data.registrationNumber
        ? data.registrationNumber.trim()
        : null;
    if (data.consultationFeeMinor !== undefined)
      doctorUpdateData.consultationFeeMinor = data.consultationFeeMinor;

    await tx.doctor.update({
      where: { id: doctorId },
      data: doctorUpdateData,
    });

    // 3. Update departments if provided
    if (data.departmentIds) {
      await tx.doctorDepartment.deleteMany({
        where: { doctorId },
      });

      if (data.departmentIds.length > 0) {
        await tx.doctorDepartment.createMany({
          data: data.departmentIds.map((departmentId) => ({
            doctorId,
            departmentId,
          })),
        });
      }
    }

    return tx.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        departments: {
          include: {
            department: true,
          },
        },
      },
    });
  });
};

/**
 * Updates doctor active/inactive status.
 */
const updateDoctorStatus = async (organizationId, doctorId, status) => {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      organizationId,
    },
  });

  if (!doctor) {
    const error = new Error("Doctor not found");
    error.statusCode = 404;
    throw error;
  }

  if (doctor.status === status) {
    const error = new Error(`Doctor is already ${status.toLowerCase()}`);
    error.statusCode = 409;
    throw error;
  }

  return prisma.doctor.update({
    where: { id: doctorId },
    data: { status },
  });
};

/**
 * Replaces doctor department assignments.
 */
const updateDoctorDepartments = async (
  organizationId,
  doctorId,
  departmentIds = [],
) => {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      organizationId,
    },
  });

  if (!doctor) {
    const error = new Error("Doctor not found");
    error.statusCode = 404;
    throw error;
  }

  if (departmentIds.length > 0) {
    const departments = await prisma.department.findMany({
      where: {
        id: { in: departmentIds },
        organizationId,
      },
    });

    if (departments.length !== departmentIds.length) {
      const error = new Error(
        "One or more departments do not belong to this organization",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.doctorDepartment.deleteMany({
      where: { doctorId },
    });

    if (departmentIds.length > 0) {
      await tx.doctorDepartment.createMany({
        data: departmentIds.map((departmentId) => ({
          doctorId,
          departmentId,
        })),
      });
    }

    return tx.doctor.findUnique({
      where: { id: doctorId },
      include: {
        departments: {
          include: {
            department: true,
          },
        },
      },
    });
  });
};

/**
 * Creates staff user and links them to the organization via OrganizationMember.
 */
const createStaff = async (organizationId, data) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  const email = data.email.trim().toLowerCase();
  const phone = data.phone ? data.phone.trim() : null;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        phone ? { phone } : undefined,
      ].filter(Boolean),
    },
  });

  if (existingUser) {
    const error = new Error(
      existingUser.email === email
        ? "A user with this email already exists"
        : "A user with this phone number already exists",
    );
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name.trim(),
        email,
        phone,
        passwordHash,
        role: "STAFF",
        tokenVersion: 0,
      },
    });

    const membership = await tx.organizationMember.create({
      data: {
        userId: user.id,
        organizationId,
        role: data.role,
        status: "ACTIVE",
      },
    });

    return {
      user,
      membership,
    };
  });

  return result;
};

/**
 * Lists staff belonging to an organization with optional pagination and filters.
 */
const getStaff = async (organizationId, query = {}) => {
  const page = query.page ? Math.max(1, parseInt(query.page, 10)) : 1;
  const limit = query.limit ? Math.min(100, Math.max(1, parseInt(query.limit, 10))) : 20;
  const skip = (page - 1) * limit;

  const where = {
    organizationId,
  };

  if (query.role) {
    where.role = query.role;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    const search = query.search.trim();
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [total, staff] = await Promise.all([
    prisma.organizationMember.count({ where }),
    prisma.organizationMember.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return {
    staff,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves a single staff membership by ID scoped to the organization.
 */
const getStaffById = async (organizationId, staffId) => {
  const staff = await prisma.organizationMember.findFirst({
    where: {
      id: staffId,
      organizationId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  if (!staff) {
    const error = new Error("Staff not found");
    error.statusCode = 404;
    throw error;
  }

  return staff;
};

/**
 * Updates staff user profile fields and/or role.
 */
const updateStaff = async (organizationId, staffId, data) => {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      id: staffId,
      organizationId,
    },
    include: {
      user: true,
    },
  });

  if (!membership) {
    const error = new Error("Staff not found");
    error.statusCode = 404;
    throw error;
  }

  const newEmail = data.email !== undefined ? data.email.trim().toLowerCase() : undefined;
  const newPhone = data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined;
  const newName = data.name !== undefined ? data.name.trim() : undefined;

  // Uniqueness check for email
  if (newEmail !== undefined && newEmail !== membership.user.email) {
    if (newEmail) {
      const emailConflict = await prisma.user.findFirst({
        where: {
          email: newEmail,
          NOT: { id: membership.user.id },
        },
      });
      if (emailConflict) {
        const error = new Error("A user with this email already exists");
        error.statusCode = 409;
        throw error;
      }
    }
  }

  // Uniqueness check for phone
  if (newPhone !== undefined && newPhone !== membership.user.phone) {
    if (newPhone) {
      const phoneConflict = await prisma.user.findFirst({
        where: {
          phone: newPhone,
          NOT: { id: membership.user.id },
        },
      });
      if (phoneConflict) {
        const error = new Error("A user with this phone number already exists");
        error.statusCode = 409;
        throw error;
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update User info if name, email, or phone changed
    const userUpdateData = {};
    if (newName !== undefined) userUpdateData.name = newName;
    if (newEmail !== undefined) userUpdateData.email = newEmail;
    if (newPhone !== undefined) userUpdateData.phone = newPhone;

    let user = membership.user;
    if (Object.keys(userUpdateData).length > 0) {
      user = await tx.user.update({
        where: { id: membership.user.id },
        data: userUpdateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      });
    } else {
      user = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      };
    }

    // 2. Update OrganizationMember role if provided
    let updatedMembership = membership;
    if (data.role !== undefined) {
      updatedMembership = await tx.organizationMember.update({
        where: { id: membership.id },
        data: { role: data.role },
      });
    }

    return {
      user,
      membership: updatedMembership,
    };
  });
};

/**
 * Updates staff status (ACTIVE or INACTIVE).
 */
const updateStaffStatus = async (organizationId, staffId, status) => {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      id: staffId,
      organizationId,
    },
  });

  if (!membership) {
    const error = new Error("Staff not found");
    error.statusCode = 404;
    throw error;
  }

  if (membership.status === status) {
    const error = new Error(`Staff is already ${status.toLowerCase()}`);
    error.statusCode = 409;
    throw error;
  }

  return prisma.organizationMember.update({
    where: { id: membership.id },
    data: { status },
  });
};

module.exports = {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  updateDoctorStatus,
  updateDoctorDepartments,
  createStaff,
  getStaff,
  getStaffById,
  updateStaff,
  updateStaffStatus,
};
