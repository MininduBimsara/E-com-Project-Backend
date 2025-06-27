// ==============================================
// routes/orderRoutes.js
// ==============================================

const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyAuth, optionalAuth } = require("../middleware/authMiddleware");

// Middleware for parsing JSON
router.use(express.json());

/**
 * Create a new order
 * POST /api/orders
 */
router.post("/", optionalAuth, orderController.createOrder);

/**
 * Get order by ID
 * GET /api/orders/:orderId
 */
router.get("/:orderId", verifyAuth, orderController.getOrderById);

/**
 * Get order by order number
 * GET /api/orders/number/:orderNumber
 */
router.get(
  "/number/:orderNumber",
  verifyAuth,
  orderController.getOrderByNumber
);

/**
 * Get user's orders
 * GET /api/orders/user/:userId
 */
router.get("/user/:userId", verifyAuth, orderController.getUserOrders);

/**
 * Cancel order
 * PUT /api/orders/:orderId/cancel
 */
router.put("/:orderId/cancel", verifyAuth, orderController.cancelOrder);

module.exports = router;
