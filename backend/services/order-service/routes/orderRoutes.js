// orderRoutes.js
const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const {
  protect,
  optionalAuth,
  requireAdmin,
} = require("../middleware/authMiddleware");

router.use(express.json());

// Order creation (optional auth for guest checkout)
router.post("/", optionalAuth, orderController.createOrder);

// Protected routes (login required)
router.get("/:orderId", protect, orderController.getOrderById);
router.get("/number/:orderNumber", protect, orderController.getOrderByNumber);
router.get("/user/:userId", protect, orderController.getUserOrders);
router.put("/:orderId/cancel", protect, orderController.cancelOrder);

// Admin routes
router.get("/admin/all", protect, requireAdmin, orderController.getAllOrders);
router.put(
  "/admin/:orderId/status",
  protect,
  requireAdmin,
  orderController.updateOrderStatus
);
router.get(
  "/admin/statistics",
  protect,
  requireAdmin,
  orderController.getOrderStatistics
);

module.exports = router;
