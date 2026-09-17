const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = require("../../config/prisma");

const register = async (data) => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        data.email ? { email: data.email } : undefined,
        data.phone ? { phone: data.phone } : undefined,
      ].filter(Boolean),
    },
  });

  if (existingUser) {
    const error = new Error("User already exists");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: "PATIENT",

      patient: {
        create: {
          name: data.name,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
        },
      },
    },

    include: {
      patient: true,
    },
  });

  return user;
};

const login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      patient: true,
      memberships: true,
      doctor: true,
    },
  });

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    },
  );

  return {
    user,
    token,
  };
};

const getMe = async (userId) => {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      patient: true,
      doctor: true,
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  });
};

module.exports = {
  register,
  login,
  getMe,
};
