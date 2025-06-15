const axios = require("axios");

/**
 * Middleware to verify user authentication by calling the user service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
      });
    }

    // Call the user service to verify the token
    const userServiceUrl =
      process.env.USER_SERVICE_URL || "http://localhost:5000";
    const response = await axios.get(`${userServiceUrl}/api/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 200 && response.data.user) {
      // Add user information to request object
      req.user = response.data.user;
      next();
    } else {
      return res.status(401).json({
        message: "Invalid token.",
      });
    }
  } catch (error) {
    console.error("Auth verification error:", error.message);

    if (error.response?.status === 401) {
      return res.status(401).json({
        message: "Invalid or expired token.",
      });
    }

    return res.status(500).json({
      message: "Authentication service unavailable.",
      error: error.message,
    });
  }
};

/**
 * Optional authentication middleware - doesn't block if no token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      req.user = null;
      return next();
    }

    // Call the user service to verify the token
    const userServiceUrl =
      process.env.USER_SERVICE_URL || "http://localhost:5000";
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
