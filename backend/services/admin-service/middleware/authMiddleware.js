// backend/services/admin-service/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// Admin Auth Middleware - specifically for admin authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check cookie first, then authorization header
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the admin user
      const admin = await Admin.findById(decoded.id).select("-password");

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Not authorized, admin not found",
        });
      }

      if (admin.status !== "active") {
        return res.status(401).json({
          success: false,
          message: "Not authorized, admin account is inactive",
        });
      }

      // Attach admin to request
      req.admin = admin;
      req.token = token;
      next();
    } catch (tokenError) {
      console.error("Token verification error:", tokenError);
      return res.status(401).json({
        success: false,
        message: "Not authorized, token is invalid",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error in authentication",
    });
  }
};

// Optional Auth - Works with or without login
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select("-password");

        if (admin && admin.status === "active") {
          req.admin = admin;
          req.token = token;
        }
      } catch (err) {
        // Invalid token, but continue without auth
        console.log("Optional auth - invalid token:", err.message);
      }
    }

    next();
  } catch (err) {
    // Continue without auth on any error
    next();
  }
};

// Super Admin only
const requireSuperAdmin = (req, res, next) => {
  if (req.admin && req.admin.role === "super_admin") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Super admin access required",
    });
  }
};

// Any Admin (admin or super_admin)
const requireAdmin = (req, res, next) => {
  if (
    req.admin &&
    (req.admin.role === "admin" || req.admin.role === "super_admin")
  ) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
};

module.exports = {
  protect,
  optionalAuth,
  requireAdmin,
  requireSuperAdmin,
};
