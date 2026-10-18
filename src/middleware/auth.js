const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      console.error("Critical Security Error: JWT_SECRET environment variable is missing.");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // Require tokenVersion in JWT for revocation safety (rejects legacy unversioned tokens)
    if (typeof decoded.tokenVersion !== "number") {
      return res.status(401).json({
        success: false,
        message: "Token format is outdated. Please log in again.",
      });
    }

    // Check against live user state in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists",
      });
    }

    // Verify tokenVersion matches current user tokenVersion
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Session has expired or was revoked. Please log in again.",
      });
    }

    // Attach decoded user information
    req.user = {
      userId: user.id,
      role: user.role,
      doctorId: decoded.doctorId || null,
      tokenVersion: user.tokenVersion,
    };

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

module.exports = authenticate;
