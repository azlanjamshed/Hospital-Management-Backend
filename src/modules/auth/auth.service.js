const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/prisma");
const { generateResetToken, hashToken } = require("../../utils/crypto.util");
const { sendPasswordResetEmail, isSmtpConfigured } = require("../../utils/email.util");

/**
 * Normalizes email by trimming and converting to lower case.
 */
const normalizeEmail = (email) => {
  return email ? email.trim().toLowerCase() : null;
};

/**
 * Normalizes phone by trimming spaces.
 */
const normalizePhone = (phone) => {
  return phone ? phone.trim() : null;
};

/**
 * Registers a new patient.
 * Creates both a User record and an associated Patient profile in a single transaction.
 */
const register = async (data) => {
  const email = normalizeEmail(data.email);
  const phone = normalizePhone(data.phone);

  if (!email && !phone) {
    const error = new Error("Either email or phone number is required");
    error.statusCode = 400;
    throw error;
  }

  // Check for existing user by email or phone
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        email ? { email } : undefined,
        phone ? { phone } : undefined,
      ].filter(Boolean),
    },
  });

  if (existingUser) {
    const error = new Error("User with this email or phone number already exists");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  try {
    const user = await prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          name: data.name.trim(),
          email,
          phone,
          passwordHash,
          role: "PATIENT",
          tokenVersion: 0,
          patient: {
            create: {
              name: data.name.trim(),
              dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
              gender: data.gender || null,
            },
          },
        },
        include: {
          patient: true,
        },
      });
    });

    return user;
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error("User with this email or phone number already exists");
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Authenticates user via identifier (email OR phone) and password.
 */
const login = async (identifierData, password) => {
  const rawIdentifier =
    identifierData.identifier || identifierData.email || identifierData.phone;

  if (!rawIdentifier) {
    const error = new Error("Email or phone number is required");
    error.statusCode = 400;
    throw error;
  }

  const isEmail = rawIdentifier.includes("@");
  const normalizedEmail = isEmail ? rawIdentifier.trim().toLowerCase() : null;
  const normalizedPhone = rawIdentifier.trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        normalizedEmail ? { email: normalizedEmail } : undefined,
        normalizedPhone ? { phone: normalizedPhone } : undefined,
      ].filter(Boolean),
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

  if (!user) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  if (!process.env.JWT_SECRET) {
    const error = new Error("JWT_SECRET is not configured on the server");
    error.statusCode = 500;
    throw error;
  }

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      doctorId: user.doctor?.id || null,
      tokenVersion: user.tokenVersion,
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

/**
 * Retrieves authenticated user profile including related patient/doctor/memberships.
 */
const getMe = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
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

/**
 * Updates permitted profile fields (name, email, phone, dateOfBirth, gender).
 */
const updateProfile = async (userId, data) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { patient: true, doctor: true },
  });

  if (!existingUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const newEmail = data.email !== undefined ? normalizeEmail(data.email) : undefined;
  const newPhone = data.phone !== undefined ? normalizePhone(data.phone) : undefined;
  const newName = data.name !== undefined ? data.name.trim() : undefined;

  // Uniqueness validation if changing email
  if (newEmail !== undefined && newEmail !== existingUser.email) {
    if (newEmail !== null) {
      const emailInUse = await prisma.user.findFirst({
        where: {
          email: newEmail,
          NOT: { id: userId },
        },
      });
      if (emailInUse) {
        const error = new Error("Email is already in use by another account");
        error.statusCode = 409;
        throw error;
      }
    }
  }

  // Uniqueness validation if changing phone
  if (newPhone !== undefined && newPhone !== existingUser.phone) {
    if (newPhone !== null) {
      const phoneInUse = await prisma.user.findFirst({
        where: {
          phone: newPhone,
          NOT: { id: userId },
        },
      });
      if (phoneInUse) {
        const error = new Error("Phone number is already in use by another account");
        error.statusCode = 409;
        throw error;
      }
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update User fields
      const userUpdateData = {};
      if (newName !== undefined) userUpdateData.name = newName;
      if (newEmail !== undefined) userUpdateData.email = newEmail;
      if (newPhone !== undefined) userUpdateData.phone = newPhone;

      const user = await tx.user.update({
        where: { id: userId },
        data: userUpdateData,
      });

      // 2. Update Patient profile if present
      if (existingUser.patient) {
        const patientUpdateData = {};
        if (newName !== undefined) patientUpdateData.name = newName;
        if (data.dateOfBirth !== undefined) {
          patientUpdateData.dateOfBirth = data.dateOfBirth
            ? new Date(data.dateOfBirth)
            : null;
        }
        if (data.gender !== undefined) {
          patientUpdateData.gender = data.gender;
        }

        if (Object.keys(patientUpdateData).length > 0) {
          await tx.patient.update({
            where: { id: existingUser.patient.id },
            data: patientUpdateData,
          });
        }
      }

      // 3. Update Doctor profile name if present
      if (existingUser.doctor && newName !== undefined) {
        await tx.doctor.update({
          where: { id: existingUser.doctor.id },
          data: { name: newName },
        });
      }

      return tx.user.findUnique({
        where: { id: userId },
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
    });

    return updated;
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error("Email or phone number already in use");
      err.statusCode = 409;
      throw err;
    }
    throw error;
  }
};

/**
 * Changes password with current-password verification.
 * Increments tokenVersion to revoke all active JWT sessions.
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, tokenVersion: true },
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 400;
    throw error;
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (isSamePassword) {
    const error = new Error("New password must be different from current password");
    error.statusCode = 400;
    throw error;
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      tokenVersion: { increment: 1 },
    },
  });

  return { success: true };
};

/**
 * Initiates password recovery workflow.
 * Always returns a generic success response to avoid account enumeration.
 * Fails safely with 503 if SMTP is not configured.
 */
const forgotPassword = async (identifierData) => {
  // Fail safely if SMTP is not configured
  if (!isSmtpConfigured()) {
    const error = new Error(
      "Email delivery service is not configured. Please contact the administrator.",
    );
    error.statusCode = 503;
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }

  const rawIdentifier =
    identifierData.identifier || identifierData.email || identifierData.phone;

  if (!rawIdentifier) {
    const error = new Error("Identifier is required");
    error.statusCode = 400;
    throw error;
  }

  const isEmail = rawIdentifier.includes("@");
  const normalizedEmail = isEmail ? rawIdentifier.trim().toLowerCase() : null;
  const normalizedPhone = rawIdentifier.trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        normalizedEmail ? { email: normalizedEmail } : undefined,
        normalizedPhone ? { phone: normalizedPhone } : undefined,
      ].filter(Boolean),
    },
    select: { id: true, name: true, email: true },
  });

  // Only proceed with token generation and email dispatch if an account with an email exists
  if (user && user.email) {
    const rawToken = generateResetToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute expiry

    await prisma.$transaction(async (tx) => {
      // Invalidate existing active tokens for this user
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          used: false,
        },
        data: {
          used: true,
        },
      });

      // Create new reset token record
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          used: false,
        },
      });
    });

    // Send the email via configured SMTP
    await sendPasswordResetEmail({
      to: user.email,
      resetToken: rawToken,
      userName: user.name,
    });
  }

  // Consistent generic response preventing account enumeration
  return {
    message:
      "If an account exists with that identifier and has a registered email, a password reset link has been sent.",
  };
};

/**
 * Resets password using a valid, unexpired reset token.
 * Single-use enforced atomically; increments tokenVersion to revoke old sessions.
 */
const resetPassword = async (rawToken, newPassword) => {
  if (!rawToken) {
    const error = new Error("Reset token is required");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = hashToken(rawToken);

  const resetTokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetTokenRecord || resetTokenRecord.used) {
    const error = new Error("Invalid or expired password reset token");
    error.statusCode = 400;
    throw error;
  }

  if (resetTokenRecord.expiresAt < new Date()) {
    const error = new Error("Password reset token has expired");
    error.statusCode = 400;
    throw error;
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    // Atomic update of used flag: guarantees single-use even under concurrent attempts
    const updateResult = await tx.passwordResetToken.updateMany({
      where: {
        id: resetTokenRecord.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: {
        used: true,
      },
    });

    if (updateResult.count === 0) {
      const error = new Error("Password reset token has already been used or expired");
      error.statusCode = 400;
      throw error;
    }

    // Update password hash and increment tokenVersion to revoke previous sessions
    await tx.user.update({
      where: { id: resetTokenRecord.userId },
      data: {
        passwordHash: newPasswordHash,
        tokenVersion: { increment: 1 },
      },
    });
  });

  return { success: true };
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
