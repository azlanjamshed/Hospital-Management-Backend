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
module.exports = {
  createDoctor,
  getDoctors,
  getDoctorById,
};
