const bcrypt = require("bcryptjs");

const prisma = require("../src/config/prisma");

const createSuperAdmin = async () => {
  const name = process.env.SUPER_ADMIN_NAME;
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required",
    );
  }

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingAdmin) {
    if (existingAdmin.role !== "SUPER_ADMIN") {
      throw new Error(
        "A user with this email already exists with a different role",
      );
    }

    console.log("Super Admin already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const superAdmin = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.log("Super Admin created successfully.");
  console.log(`Email: ${superAdmin.email}`);
};

createSuperAdmin()
  .catch((error) => {
    console.error("Failed to create Super Admin:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
