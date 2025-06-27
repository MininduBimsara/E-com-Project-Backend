// ==============================================
// middleware/authMiddleware.js
// ==============================================

const axios = require("axios");

/**
 * Middleware to verify user authentication
 */
const verifyAuth = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else {
      token = req.header("Authorization")?.replace("Bearer ", "");
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const userServiceUrl =
      process.env.USER_SERVICE_URL || "http://localhost:4000";
    const response = await axios.get(`${userServiceUrl}/api/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 200 && response.data.user) {
      req.user = response.data.user;
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }
  } catch (error) {
    console.error("Auth verification error:", error.message);

    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication service unavailable.",
      error: error.message,
    });
  }
};

/**
 * Optional authentication middleware
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else {
      token = req.header("Authorization")?.replace("Bearer ", "");
    }

    if (!token) {
      req.user = null;
      return next();
    }

    const userServiceUrl =
      process.env.USER_SERVICE_URL || "http://localhost:4000";
    const response = await axios.get(`${userServiceUrl}/api/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 200 && response.data.user) {
      req.user = response.data.user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error("Optional auth verification error:", error.message);
    req.user = null;
    next();
  }
};

module.exports = {
  verifyAuth,
  optionalAuth,
};
