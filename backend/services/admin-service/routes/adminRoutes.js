const express = require("express");
const {
  registerAdmin,
  login,
  getProfile,
  getDashboard,
  getUsers,
  getProducts,
  getOrders,
  updateOrderStatus,
  updateUserStatus,
  logout,
} = require("../controllers/adminController");
const { protect, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// ========================================
// INTERNAL ROUTES (Service-to-Service)
// ========================================
// Internal admin creation route - UNPROTECTED for service-to-service calls
router.post("/api/admin/register", registerAdmin);

// ========================================
// PUBLIC ROUTES
// ========================================
router.post("/api/admin/login", login);

// ========================================
// PROTECTED ROUTES (require authentication)
// ========================================
router.use("/api/admin", protect); // Apply auth middleware to all routes below

// Profile routes
router.get("/api/admin/profile", getProfile);
router.post("/api/admin/logout", logout);

// Dashboard route
router.get("/api/admin/dashboard", getDashboard);

// User management routes
router.get("/api/admin/users", getUsers);
router.put("/api/admin/users/:userId/status", updateUserStatus);

// Product management routes
router.get("/api/admin/products", getProducts);

// Order management routes
router.get("/api/admin/orders", getOrders);
router.put("/api/admin/orders/:orderId/status", updateOrderStatus);

// ========================================
// SUPER ADMIN ONLY ROUTES
// ========================================
// If you want some routes only for super admins, uncomment below:
// router.use(requireAdmin);
// router.delete('/api/admin/users/:userId', deleteUser); // Example

module.exports = router;
