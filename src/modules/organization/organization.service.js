const prisma = require("../../config/prisma");
const bcrypt = require("bcryptjs");

const createOrganization = async (data) => {
  const existingOrganization = await prisma.organization.findFirst({
    where: {
      OR: [
        data.email ? { email: data.email } : undefined,
        data.phone ? { phone: data.phone } : undefined,
      ].filter(Boolean),
    },
  });

  if (existingOrganization) {
    const error = new Error(
      "An organization with this email or phone already exists",
    );

    error.statusCode = 409;

    throw error;
  }

  const organization = await prisma.organization.create({
    data: {
      name: data.name,
      type: data.type,
      timezone: data.timezone,
      address: data.address,
      phone: data.phone,
      email: data.email,
    },
  });

  return organization;
};

const createOrganizationAdmin = async (data) => {
  // 1. Check organization exists
  const organization = await prisma.organization.findUnique({
    where: {
      id: data.organizationId,
    },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Check if email already belongs to a user
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

  // 3. Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // 4. Create User + OrganizationMember together
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
        organizationId: data.organizationId,
        role: "ADMIN",
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

module.exports = {
  createOrganization,
  createOrganizationAdmin,
};
