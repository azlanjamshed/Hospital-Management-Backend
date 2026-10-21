const prisma = require("../../config/prisma");

/**
 * Creates a new department scoped to an organization.
 */
const createDepartment = async (organizationId, data) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  const name = data.name.trim();

  // Case-insensitive uniqueness check within this organization
  const existingDepartment = await prisma.department.findFirst({
    where: {
      organizationId,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existingDepartment) {
    const error = new Error(
      "A department with this name already exists in this organization",
    );
    error.statusCode = 409;
    throw error;
  }

  return prisma.department.create({
    data: {
      organizationId,
      name,
      status: data.status || "ACTIVE",
    },
  });
};

/**
 * Lists departments belonging to an organization with pagination and filters.
 */
const getDepartments = async (organizationId, query = {}) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  const page = query.page ? Math.max(1, parseInt(query.page, 10)) : 1;
  const limit = query.limit
    ? Math.min(100, Math.max(1, parseInt(query.limit, 10)))
    : 20;
  const skip = (page - 1) * limit;

  const where = {
    organizationId,
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    where.name = {
      contains: query.search.trim(),
      mode: "insensitive",
    };
  }

  const [total, departments] = await Promise.all([
    prisma.department.count({ where }),
    prisma.department.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: {
          select: { doctors: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return {
    departments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves department details by ID scoped to the organization.
 */
const getDepartmentById = async (organizationId, departmentId) => {
  const department = await prisma.department.findFirst({
    where: {
      id: departmentId,
      organizationId,
    },
    include: {
      doctors: {
        include: {
          doctor: {
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
            },
          },
        },
      },
      _count: {
        select: {
          doctors: true,
        },
      },
    },
  });

  if (!department) {
    const error = new Error("Department not found");
    error.statusCode = 404;
    throw error;
  }

  return department;
};

/**
 * Retrieves doctors assigned to a specific department.
 */
const getDepartmentDoctors = async (
  organizationId,
  departmentId,
  query = {},
) => {
  const department = await prisma.department.findFirst({
    where: {
      id: departmentId,
      organizationId,
    },
  });

  if (!department) {
    const error = new Error("Department not found");
    error.statusCode = 404;
    throw error;
  }

  const page = query.page ? Math.max(1, parseInt(query.page, 10)) : 1;
  const limit = query.limit
    ? Math.min(100, Math.max(1, parseInt(query.limit, 10)))
    : 20;
  const skip = (page - 1) * limit;

  const where = {
    departmentId,
    doctor: {
      organizationId,
      ...(query.status && { status: query.status }),
    },
  };

  const [total, doctorDepartments] = await Promise.all([
    prisma.doctorDepartment.count({ where }),
    prisma.doctorDepartment.findMany({
      where,
      skip,
      take: limit,
      include: {
        doctor: {
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
          },
        },
      },
      orderBy: {
        doctor: {
          createdAt: "desc",
        },
      },
    }),
  ]);

  const doctors = doctorDepartments.map((dd) => dd.doctor);

  return {
    department: {
      id: department.id,
      name: department.name,
      status: department.status,
    },
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
 * Updates permitted department fields (e.g. name).
 */
const updateDepartment = async (organizationId, departmentId, data) => {
  const department = await prisma.department.findFirst({
    where: {
      id: departmentId,
      organizationId,
    },
  });

  if (!department) {
    const error = new Error("Department not found");
    error.statusCode = 404;
    throw error;
  }

  const newName = data.name ? data.name.trim() : undefined;

  if (newName !== undefined && newName.toLowerCase() !== department.name.toLowerCase()) {
    const existingDepartment = await prisma.department.findFirst({
      where: {
        organizationId,
        name: {
          equals: newName,
          mode: "insensitive",
        },
        NOT: { id: departmentId },
      },
    });

    if (existingDepartment) {
      const error = new Error(
        "A department with this name already exists in this organization",
      );
      error.statusCode = 409;
      throw error;
    }
  }

  return prisma.department.update({
    where: {
      id: departmentId,
    },
    data: {
      ...(newName !== undefined && {
        name: newName,
      }),
    },
  });
};

/**
 * Updates department status (ACTIVE or INACTIVE).
 * Preserves doctor relations and existing clinical records.
 */
const updateDepartmentStatus = async (organizationId, departmentId, status) => {
  const department = await prisma.department.findFirst({
    where: {
      id: departmentId,
      organizationId,
    },
    include: {
      _count: {
        select: { doctors: true },
      },
    },
  });

  if (!department) {
    const error = new Error("Department not found");
    error.statusCode = 404;
    throw error;
  }

  if (department.status === status) {
    const error = new Error(`Department is already ${status.toLowerCase()}`);
    error.statusCode = 409;
    throw error;
  }

  return prisma.department.update({
    where: {
      id: departmentId,
    },
    data: {
      status,
    },
    include: {
      _count: {
        select: { doctors: true },
      },
    },
  });
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  getDepartmentDoctors,
  updateDepartment,
  updateDepartmentStatus,
};
