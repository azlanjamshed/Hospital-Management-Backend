const prisma = require("../../config/prisma");

const createDepartment = async (organizationId, data) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  const existingDepartment = await prisma.department.findUnique({
    where: {
      organizationId_name: {
        organizationId,
        name: data.name,
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
      name: data.name,
    },
  });
};

const getDepartments = async (organizationId) => {
  return prisma.department.findMany({
    where: {
      organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getDepartmentById = async (organizationId, departmentId) => {
  const department = await prisma.department.findFirst({
    where: {
      id: departmentId,
      organizationId,
    },
    include: {
      doctors: {
        include: {
          doctor: true,
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

  if (data.name !== undefined && data.name !== department.name) {
    const existingDepartment = await prisma.department.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: data.name,
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
  }

  return prisma.department.update({
    where: {
      id: departmentId,
    },
    data: {
      ...(data.name !== undefined && {
        name: data.name,
      }),
    },
  });
};

const updateDepartmentStatus = async (organizationId, departmentId, status) => {
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
  });
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  updateDepartmentStatus,
};
