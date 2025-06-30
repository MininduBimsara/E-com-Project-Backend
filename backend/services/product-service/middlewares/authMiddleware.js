const jwt = require("jsonwebtoken");
const axios = require("axios");

/**
 * Middleware to verify user authentication by calling the user service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const verifyAuth = async (req, res, next) => {
  try {
    let token;

    // Check cookie only
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
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
    let token;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      req.token = token;
    } else {
      req.user = null;
      req.token = null;
    }
    next();
  } catch (err) {
    req.user = null;
    req.token = null;
    next();
  }
};

// Admin only
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Admin access required" });
  }
};

// Verify user exists in user service
const verifyUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userServiceUrl =
      process.env.USER_SERVICE_URL || "http://localhost:4000";

    const response = await axios.get(`${userServiceUrl}/api/users/profile`, {
      headers: {
        Cookie: `token=${req.token}`,
      },
      timeout: 5000,
    });

    if (response.status === 200) {
      next();
    } else {
      res.status(401).json({ message: "Invalid user" });
    }
  } catch (error) {
    console.error("User verification error:", error.message);
    res.status(401).json({ message: "User verification failed" });
  }
};

module.exports = {
  verifyAuth,
  optionalAuth,
  requireAdmin,
  verifyUser,
};
