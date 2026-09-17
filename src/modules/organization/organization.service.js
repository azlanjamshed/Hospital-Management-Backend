const prisma = require("../../config/prisma");

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

module.exports = {
  createOrganization,
};
