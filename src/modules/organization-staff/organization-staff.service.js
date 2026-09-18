const bcrypt = require("bcryptjs");
const prisma = require("../../config/prisma");

const createDoctor = async (organizationId, data) => {
  // 1. Verify organization exists
  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Check whether email already exists
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    const error = new Error("A user with this email already exists");

    error.statusCode = 409;
    throw error;
  }

  // 3. If registration number is provided,
  //    check whether another doctor in this organization has it
  if (data.registrationNumber) {
    const existingDoctor = await prisma.doctor.findFirst({
      where: {
        organizationId,
        registrationNumber: data.registrationNumber,
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
  if (data.departmentIds.length > 0) {
    const departments = await prisma.department.findMany({
      where: {
        id: {
          in: data.departmentIds,
        },
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

  // 5. Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // 6. Create User + Doctor + Department relationships
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: "DOCTOR",
      },
    });

    const doctor = await tx.doctor.create({
      data: {
        organizationId,
        userId: user.id,
        name: data.name,
        qualification: data.qualification,
        registrationNumber: data.registrationNumber,
        consultationFeeMinor: data.consultationFeeMinor,
      },
    });

    if (data.departmentIds.length > 0) {
      await tx.doctorDepartment.createMany({
        data: data.departmentIds.map((departmentId) => ({
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

const getDoctors = async (organizationId) => {
  const doctors = await prisma.doctor.findMany({
    where: {
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return doctors;
};

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

const updateDoctor = async (organizationId, doctorId, data) => {
  // 1. Find doctor inside this organization
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

  // 2. Check registration number if it is being changed
  if (
    data.registrationNumber &&
    data.registrationNumber !== doctor.registrationNumber
  ) {
    const existingDoctor = await prisma.doctor.findFirst({
      where: {
        organizationId,
        registrationNumber: data.registrationNumber,
        id: {
          not: doctorId,
        },
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

  // 3. Verify departments belong to this organization
  if (data.departmentIds) {
    const departments = await prisma.department.findMany({
      where: {
        id: {
          in: data.departmentIds,
        },
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

  // 4. Update doctor + department relationships
  const result = await prisma.$transaction(async (tx) => {
    const updatedDoctor = await tx.doctor.update({
      where: {
        id: doctorId,
      },
      data: {
        ...(data.name !== undefined && {
          name: data.name,
        }),
        ...(data.qualification !== undefined && {
          qualification: data.qualification,
        }),
        ...(data.registrationNumber !== undefined && {
          registrationNumber: data.registrationNumber,
        }),
        ...(data.consultationFeeMinor !== undefined && {
          consultationFeeMinor: data.consultationFeeMinor,
        }),
      },
    });

    // Update User name/phone if those fields were provided
    if (data.name !== undefined || data.phone !== undefined) {
      await tx.user.update({
        where: {
          id: doctor.userId,
        },
        data: {
          ...(data.name !== undefined && {
            name: data.name,
          }),
          ...(data.phone !== undefined && {
            phone: data.phone,
          }),
        },
      });
    }

    // Replace department assignments only when departmentIds is provided
    if (data.departmentIds !== undefined) {
      await tx.doctorDepartment.deleteMany({
        where: {
          doctorId,
        },
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

    return updatedDoctor;
  });

  return result;
};

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
    where: {
      id: doctorId,
    },
    data: {
      status,
    },
  });
};
const updateDoctorDepartments = async (
  organizationId,
  doctorId,
  departmentIds,
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

  // Make sure every department belongs to this organization
  if (departmentIds.length > 0) {
    const departments = await prisma.department.findMany({
      where: {
        id: {
          in: departmentIds,
        },
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
    // Remove current assignments
    await tx.doctorDepartment.deleteMany({
      where: {
        doctorId,
      },
    });

    // Add new assignments
    if (departmentIds.length > 0) {
      await tx.doctorDepartment.createMany({
        data: departmentIds.map((departmentId) => ({
          doctorId,
          departmentId,
        })),
      });
    }

    return tx.doctor.findUnique({
      where: {
        id: doctorId,
      },
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
const createStaff = async (organizationId, data) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        data.phone ? { phone: data.phone } : undefined,
      ].filter(Boolean),
    },
  });

  if (existingUser) {
    const error = new Error(
      existingUser.email === data.email
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
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: "STAFF",
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

const getStaff = async (organizationId) => {
  const staff = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      role: {
        in: ["MANAGER", "RECEPTIONIST", "NURSE"],
      },
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
    orderBy: {
      createdAt: "desc",
    },
  });

  return staff;
};

const getStaffById = async (organizationId, staffId) => {
  const staff = await prisma.organizationMember.findFirst({
    where: {
      id: staffId,
      organizationId,
      role: {
        in: ["MANAGER", "RECEPTIONIST", "NURSE"],
      },
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

const updateStaff = async (organizationId, staffId, data) => {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      id: staffId,
      organizationId,
      role: {
        in: ["MANAGER", "RECEPTIONIST", "NURSE"],
      },
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

  // Check whether the new phone number belongs to another user
  if (data.phone !== undefined && data.phone !== membership.user.phone) {
    const existingUser = await prisma.user.findUnique({
      where: {
        phone: data.phone,
      },
    });

    if (existingUser && existingUser.id !== membership.user.id) {
      const error = new Error("A user with this phone number already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  return prisma.$transaction(async (tx) => {
    // Update global user information
    const user = await tx.user.update({
      where: {
        id: membership.user.id,
      },
      data: {
        ...(data.name !== undefined && {
          name: data.name,
        }),
        ...(data.phone !== undefined && {
          phone: data.phone,
        }),
      },
    });

    // Update organization-specific role
    const updatedMembership = await tx.organizationMember.update({
      where: {
        id: membership.id,
      },
      data: {
        ...(data.role !== undefined && {
          role: data.role,
        }),
      },
    });

    return {
      user,
      membership: updatedMembership,
    };
  });
};
const updateStaffStatus = async (organizationId, staffId, status) => {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      id: staffId,
      organizationId,
      role: {
        in: ["MANAGER", "RECEPTIONIST", "NURSE"],
      },
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
    where: {
      id: membership.id,
    },
    data: {
      status,
    },
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
