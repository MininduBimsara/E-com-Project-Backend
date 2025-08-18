const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const {
  verifyAuth,
  optionalAuth,
  requireAdmin,
} = require("../middleware/authMiddleware");

router.use(express.json());

// Order creation (optional auth for guest checkout)
router.post("/", optionalAuth, orderController.createOrder);

// verifyAuthed routes (login required)
router.get("/:orderId", verifyAuth, orderController.getOrderById);
router.get("/number/:orderNumber", verifyAuth, orderController.getOrderByNumber);
router.get("/user/:userId", verifyAuth, orderController.getUserOrders);
router.put("/:orderId/cancel", verifyAuth, orderController.cancelOrder);

// ===============================
// PAYMENT SERVICE INTEGRATION ROUTES
// ===============================

// Get order details for payment processing (called by Payment Service)
router.get("/:orderId/payment-details", orderController.getOrderForPayment);

// Update order payment status (called by Payment Service)
router.put(
  "/:orderId/payment-confirmation",
  orderController.updatePaymentStatus
);

// ===============================
// ADMIN ROUTES (if you want them)
// ===============================

// Update order status (admin only)
router.put(
  "/admin/:orderId/status",
  verifyAuth,
  requireAdmin,
  orderController.updateOrderStatus
);

// Get orders by payment status (admin only)
router.get(
  "/admin/payment-status/:paymentStatus",
  verifyAuth,
  requireAdmin,
  orderController.getOrdersByPaymentStatus
);

// Get order statistics (admin only)
router.get(
  "/admin/statistics",
  verifyAuth,
  requireAdmin,
  orderController.getOrderStatisticsAdmin
);

module.exports = router;
