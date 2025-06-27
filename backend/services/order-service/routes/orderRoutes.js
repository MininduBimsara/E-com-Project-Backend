const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const {
  protect,
  optionalAuth,
  requireOwnerOrAdmin,
  requireAdmin,
} = require("../middleware/authMiddleware");

// Middleware for parsing JSON
router.use(express.json());

// ==========================================
// ORDER CREATION (OPTIONAL AUTH)
// ==========================================

/**
 * Create a new order
 * POST /api/orders
 * Optional auth - allows guest checkout
 */
router.post("/", optionalAuth, orderController.createOrder);

// ==========================================
// PROTECTED ORDER OPERATIONS
// ==========================================

/**
 * Get order by ID
 * GET /api/orders/:orderId
 * Requires authentication and ownership verification
 */
router.get("/:orderId", protect, orderController.getOrderById);

/**
 * Get order by order number
 * GET /api/orders/number/:orderNumber
 * Requires authentication and ownership verification
 */
router.get("/number/:orderNumber", protect, orderController.getOrderByNumber);

/**
 * Get user's orders
 * GET /api/orders/user/:userId
 * Requires authentication and user must be owner or admin
 */
router.get(
  "/user/:userId",
  protect,
  requireOwnerOrAdmin(),
  orderController.getUserOrders
);

/**
 * Cancel order
 * PUT /api/orders/:orderId/cancel
 * Requires authentication and ownership verification
 */
router.put("/:orderId/cancel", protect, orderController.cancelOrder);

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * Get all orders (Admin only)
 * GET /api/orders/admin/all
 */
router.get("/admin/all", protect, requireAdmin, orderController.getAllOrders);

/**
 * Update order status (Admin only)
 * PUT /api/orders/admin/:orderId/status
 */
router.put(
  "/admin/:orderId/status",
  protect,
  requireAdmin,
  orderController.updateOrderStatus
);

/**
 * Get order statistics (Admin only)
 * GET /api/orders/admin/statistics
 */
router.get(
  "/admin/statistics",
  protect,
  requireAdmin,
  orderController.getOrderStatistics
);

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================

// Handle 404 for unmatched routes
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Order API route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      "POST / - Create order",
      "GET /:orderId - Get order by ID",
      "GET /number/:orderNumber - Get order by number",
      "GET /user/:userId - Get user orders",
      "PUT /:orderId/cancel - Cancel order",
      "GET /admin/all - Get all orders (Admin)",
      "PUT /admin/:orderId/status - Update order status (Admin)",
      "GET /admin/statistics - Get statistics (Admin)",
    ],
  });
});

// Global error handler for order routes
router.use((error, req, res, next) => {
  console.error("Order route error:", error);

  // Handle different types of errors
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      error: error.message,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      error: error.message,
    });
  }

  // Default server error
  res.status(500).json({
    success: false,
    message: "Internal server error in order service",
    error:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : error.message,
  });
});

module.exports = router;
