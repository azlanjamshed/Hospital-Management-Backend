const authService = require("./auth.service");

/**
 * Format patient details safely
 */
const formatPatient = (patient) => {
  if (!patient) return null;
  return {
    id: patient.id,
    name: patient.name,
    dateOfBirth: patient.dateOfBirth,
    gender: patient.gender,
  };
};

/**
 * Format memberships safely
 */
const formatMemberships = (memberships = []) => {
  return memberships.map((membership) => ({
    id: membership.id,
    organizationId: membership.organizationId,
    role: membership.role,
    status: membership.status,
    organization: membership.organization
      ? {
          id: membership.organization.id,
          name: membership.organization.name,
          type: membership.organization.type,
        }
      : null,
  }));
};

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const user = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        dateOfBirth: user.patient?.dateOfBirth || null,
        gender: user.patient?.gender || null,
        patientId: user.patient?.id || null,
      },
    });
  } catch (error) {
    if (!error.statusCode) console.error("Register error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Registration failed",
    });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const result = await authService.login(req.body, req.body.password);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token: result.token,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role,
          dateOfBirth: result.user.patient?.dateOfBirth || null,
          gender: result.user.patient?.gender || null,
          patientId: result.user.patient?.id || null,
          doctorId: result.user.doctor?.id || null,
          memberships: formatMemberships(result.user.memberships),
        },
      },
    });
  } catch (error) {
    if (!error.statusCode) console.error("Login error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Login failed",
    });
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = await authService.getMe(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        patient: formatPatient(user.patient),
        doctor: user.doctor
          ? {
              id: user.doctor.id,
              name: user.doctor.name,
              status: user.doctor.status,
              availabilityStatus: user.doctor.availabilityStatus,
            }
          : null,
        memberships: formatMemberships(user.memberships),
      },
    });
  } catch (error) {
    console.error("getMe error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to fetch user profile",
    });
  }
};

/**
 * PATCH /api/auth/me
 */
const updateProfile = async (req, res) => {
  try {
    const user = await authService.updateProfile(req.user.userId, req.body);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        patient: formatPatient(user.patient),
        doctor: user.doctor
          ? {
              id: user.doctor.id,
              name: user.doctor.name,
              status: user.doctor.status,
              availabilityStatus: user.doctor.availabilityStatus,
            }
          : null,
        memberships: formatMemberships(user.memberships),
      },
    });
  } catch (error) {
    if (!error.statusCode) console.error("Update profile error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update profile",
    });
  }
};

/**
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword,
    );

    res.status(200).json({
      success: true,
      message: "Password changed successfully. Existing sessions have been revoked.",
    });
  } catch (error) {
    if (!error.statusCode) console.error("Change password error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to change password",
    });
  }
};

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const result = await authService.forgotPassword(req.body);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (!error.statusCode) console.error("Forgot password error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to process password reset request",
    });
  }
};

/**
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      message:
        "Password has been reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    if (!error.statusCode) console.error("Reset password error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to reset password",
    });
  }
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
