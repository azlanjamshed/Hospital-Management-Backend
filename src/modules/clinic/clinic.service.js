const prisma = require("../../../src/db/prisma");

const createClinic = async (data) => {
  return prisma.clinic.create({
    data: {
      name: data.name,
      timezone: data.timezone,
      address: data.address,
      phone: data.phone,
    },
  });
};

const getClinics = async () => {
  return prisma.clinic.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getClinicById = async (id) => {
  const clinic = await prisma.clinic.findUnique({
    where: { id },
  });
  if (!clinic) {
    throw new Error("Clinic not found");
  }
  return clinic;
};

const updateClinic = async (id, data) => {
  const clinic = await prisma.clinic.findUnique({
    where: { id },
  });
  if (!clinic) {
    throw new Error("Clinic not found");
  }
  return prisma.clinic.update({
    where: { id },
    data,
  });
};

const deleteClinic = async (id) => {
  const clinic = await prisma.clinic.findUnique({
    where: { id },
  });

  if (!clinic) {
    return null;
  }

  return prisma.clinic.delete({
    where: { id },
  });
};

module.exports = {
  createClinic,
  getClinics,
  getClinicById,
  updateClinic,
  deleteClinic,
};
