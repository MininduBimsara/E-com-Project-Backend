const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("express-async-handler");

exports.protect = asyncHandler(async (req, res, next) => {
  // List of public routes that don't require authentication
  const publicRoutes = [
    "/api/events/all", // Use the path, not the full URL
  ];

  // Check if the current route is public
  if (publicRoutes.includes(req.path)) {
    return next(); // Skip authentication for public routes
  }

  // Check for token in cookies
  const token = req.cookies.token;

  // If no token in cookies, check Authorization header as fallback
  // (Helpful during transition from client-side token storage to cookies)
  const authHeader = req.headers.authorization;
  const headerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  // Use cookie token if available, otherwise try header token
  const finalToken = token || headerToken;

  if (!finalToken) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    // Verify token
    const decoded = jwt.verify(finalToken, process.env.JWT_SECRET);

    // Find the user and attach it to req.user
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // Attach user object to request
    next(); // Proceed to the next middleware
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    }
    res.status(400).json({ message: "Invalid token" });
  }
});

// 🔐 Role-based middleware
exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};


