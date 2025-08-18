const jwt = require("jsonwebtoken");
const axios = require("axios");

/**
 * Extract token from Authorization header or Cookie header
 * @param {Object} req - Express request object
 * @returns {string|null} token
 */
const extractToken = (req) => {
  let token = null;

  // From Authorization header: Bearer <token>
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // From Cookie header: token=xxx
  if (!token && req.headers.cookie) {
    const cookieHeader = req.headers.cookie;
    const tokenMatch = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("token="));
    if (tokenMatch) {
      token = tokenMatch.split("=")[1];
    }
  }

  return token;
};

/**
 * Middleware to strictly verify authentication (required)
 */
const verifyAuth = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/**
 * Middleware to optionally attach user info if token exists
 */
const optionalAuth = (req, res, next) => {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      req.token = token;
    } catch (err) {
      console.warn("Invalid token in optionalAuth:", err.message);
      req.user = null;
      req.token = null;
    }
  } else {
    req.user = null;
    req.token = null;
  }
console.log("JWT_SECRET loaded in optionalAuth:", process.env.JWT_SECRET);

  next();
};

/**
 * Middleware to ensure admin access
 */
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Admin access required" });
  }
};

/**
 * Middleware to verify the user exists in user service (optional)
 */
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
