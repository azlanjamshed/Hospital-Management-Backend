const prisma = require("../../config/prisma");
const bcrypt = require("bcryptjs");

/**
 * Creates a new organization. Restricted to SUPER_ADMIN.
 */
const createOrganization = async (data) => {
  const email = data.email ? data.email.trim().toLowerCase() : null;
  const phone = data.phone ? data.phone.trim() : null;

  const existingOrganization = await prisma.organization.findFirst({
    where: {
      OR: [
        email ? { email } : undefined,
        phone ? { phone } : undefined,
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
      name: data.name.trim(),
      type: data.type || "HOSPITAL",
      timezone: data.timezone ? data.timezone.trim() : "Asia/Kolkata",
      address: data.address ? data.address.trim() : null,
      phone,
      email,
    },
  });

  return organization;
};

/**
 * Creates an initial organization administrator user and links them via OrganizationMember.
 */
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

  const email = data.email.trim().toLowerCase();
  const phone = data.phone ? data.phone.trim() : null;

  // 2. Check if email already belongs to a user
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        phone ? { phone } : undefined,
      ].filter(Boolean),
    },
  });

  if (existingUser) {
    const error = new Error("A user with this email or phone already exists");
    error.statusCode = 409;
    throw error;
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // 4. Create User + OrganizationMember together in a transaction
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

/**
 * Lists organizations with pagination and filtering. Restricted to SUPER_ADMIN.
 */
const listOrganizations = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const where = {};

  if (query.type) {
    where.type = query.type;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    const search = query.search.trim();
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, organizations] = await Promise.all([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            members: true,
            doctors: true,
            departments: true,
            patients: true,
          },
        },
      },
    }),
  ]);

  return {
    organizations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Retrieves an organization by ID with relationship counts.
 */
const getOrganizationById = async (organizationId) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      _count: {
        select: {
          members: true,
          doctors: true,
          departments: true,
          patients: true,
          appointments: true,
        },
      },
    },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  return organization;
};

/**
 * Updates permitted profile fields for an organization.
 * Rejects status modification if requester is not SUPER_ADMIN.
 */
const updateOrganization = async (organizationId, updateData, userRole) => {
  const existing = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!existing) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  // Privileged field check: status change requires platform SUPER_ADMIN
  if (updateData.status && userRole !== "SUPER_ADMIN") {
    const error = new Error(
      "Only platform super administrators can modify organization status",
    );
    error.statusCode = 403;
    throw error;
  }

  const sanitizedData = {};

  if (updateData.name !== undefined) sanitizedData.name = updateData.name.trim();
  if (updateData.type !== undefined) sanitizedData.type = updateData.type;
  if (updateData.timezone !== undefined) sanitizedData.timezone = updateData.timezone.trim();
  if (updateData.address !== undefined) sanitizedData.address = updateData.address ? updateData.address.trim() : null;

  // Uniqueness check for email
  if (updateData.email !== undefined) {
    const email = updateData.email ? updateData.email.trim().toLowerCase() : null;
    if (email && email !== existing.email) {
      const emailConflict = await prisma.organization.findFirst({
        where: {
          email,
          NOT: { id: organizationId },
        },
      });
      if (emailConflict) {
        const error = new Error(
          "An organization with this email already exists",
        );
        error.statusCode = 409;
        throw error;
      }
    }
    sanitizedData.email = email;
  }

  // Uniqueness check for phone
  if (updateData.phone !== undefined) {
    const phone = updateData.phone ? updateData.phone.trim() : null;
    if (phone && phone !== existing.phone) {
      const phoneConflict = await prisma.organization.findFirst({
        where: {
          phone,
          NOT: { id: organizationId },
        },
      });
      if (phoneConflict) {
        const error = new Error(
          "An organization with this phone number already exists",
        );
        error.statusCode = 409;
        throw error;
      }
    }
    sanitizedData.phone = phone;
  }

  if (updateData.status !== undefined && userRole === "SUPER_ADMIN") {
    sanitizedData.status = updateData.status;
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: sanitizedData,
  });

  return updated;
};

/**
 * Reads organization settings (schema-backed fields such as timezone).
 */
const getOrganizationSettings = async (organizationId) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      timezone: true,
      status: true,
    },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    organizationId: organization.id,
    timezone: organization.timezone,
  };
};

/**
 * Updates organization settings (schema-backed fields such as timezone).
 */
const updateOrganizationSettings = async (organizationId, settingsData) => {
  const existing = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!existing) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      timezone: settingsData.timezone.trim(),
    },
    select: {
      id: true,
      name: true,
      timezone: true,
    },
  });

  return {
    organizationId: updated.id,
    timezone: updated.timezone,
  };
};

module.exports = {
  createOrganization,
  createOrganizationAdmin,
  listOrganizations,
  getOrganizationById,
  updateOrganization,
  getOrganizationSettings,
  updateOrganizationSettings,
};
