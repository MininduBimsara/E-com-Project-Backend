const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const {
  protect,
  optionalAuth,
  requireAdmin,
} = require("../middleware/authMiddleware");

router.use(express.json());

// Public routes (no auth needed)
router.get("/:userId/count", cartController.getCartCount);
router.get("/:userId/summary", cartController.getCartSummary);

// Optional auth routes (works with or without login)
router.get("/:userId", optionalAuth, cartController.getCart);
router.post("/:userId/add", optionalAuth, cartController.addToCart);
router.put(
  "/:userId/item/:productId",
  optionalAuth,
  cartController.updateCartItem
);
router.delete(
  "/:userId/item/:productId",
  optionalAuth,
  cartController.removeFromCart
);
router.delete("/:userId/clear", optionalAuth, cartController.clearCart);
router.put("/:userId/shipping", optionalAuth, cartController.updateShipping);

// Protected routes (login required)
router.post("/:userId/validate", protect, cartController.validateCart);

// Admin routes
router.get(
  "/admin/statistics",
  protect,
  requireAdmin,
  cartController.getCartStatistics
);

module.exports = router;
