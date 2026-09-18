const authService = require("./auth.service");

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
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        patientId: user.patient?.id,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Registration failed",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

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
          dateOfBirth: result.user.dateOfBirth,
          patientId: result.user.patient?.id,
          doctorId: result.user.doctor?.id,

          memberships: result.user.memberships.map((membership) => ({
            id: membership.id,
            organizationId: membership.organizationId,
            role: membership.role,
            status: membership.status,
            organization: {
              id: membership.organization.id,
              name: membership.organization.name,
              type: membership.organization.type,
            },
          })),
        },
      },
    });
  } catch (error) {
    console.error(error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Login failed",
    });
  }
};

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
        dateOfBirth: user.dateOfBirth,
        patient: user.patient,
        doctor: user.doctor,
        memberships: user.memberships,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
