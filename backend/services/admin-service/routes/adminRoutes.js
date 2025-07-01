const express = require("express");
const {
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
const { protect, requireSuperAdmin } = require("../middlewares/auth");

const router = express.Router();

// ========================================
// PUBLIC ROUTES
// ========================================
router.post("/login", login);

// ========================================
// PROTECTED ROUTES (require authentication)
// ========================================
router.use(protect); // Apply auth middleware to all routes below

// Profile routes
router.get("/profile", getProfile);
router.post("/logout", logout);

// Dashboard route
router.get("/dashboard", getDashboard);

// User management routes
router.get("/users", getUsers);
router.put("/users/:userId/status", updateUserStatus);

// Product management routes
router.get("/products", getProducts);

// Order management routes
router.get("/orders", getOrders);
router.put("/orders/:orderId/status", updateOrderStatus);

// ========================================
// SUPER ADMIN ONLY ROUTES
// ========================================
// If you want some routes only for super admins, uncomment below:
// router.use(requireSuperAdmin);
// router.delete('/users/:userId', deleteUser); // Example

module.exports = router;
