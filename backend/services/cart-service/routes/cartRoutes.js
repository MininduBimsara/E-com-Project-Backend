const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const {
  protect,
  optionalAuth,
  requireOwnerOrAdmin,
} = require("../middleware/authMiddleware");

// Middleware for parsing JSON (if not set globally)
router.use(express.json());

// ==========================================
// PUBLIC/GUEST CART OPERATIONS
// ==========================================

/**
 * Get cart items count (no auth required for guest carts)
 * GET /api/cart/:userId/count
 */
router.get("/:userId/count", cartController.getCartCount);

/**
 * Get lightweight cart summary (no auth required for guest carts)
 * GET /api/cart/:userId/summary
 */
router.get("/:userId/summary", cartController.getCartSummary);

// ==========================================
// CART OPERATIONS WITH OPTIONAL AUTH
// ==========================================

/**
 * Get user's cart with full product details
 * GET /api/cart/:userId
 * Optional auth - works for both guest and authenticated users
 */
router.get("/:userId", optionalAuth, cartController.getCart);

/**
 * Add item to cart
 * POST /api/cart/:userId/add
 * Optional auth - allows guest cart functionality
 * Body: { productId: string, quantity: number }
 */
router.post("/:userId/add", optionalAuth, cartController.addToCart);

/**
 * Update item quantity in cart
 * PUT /api/cart/:userId/item/:productId
 * Optional auth - allows guest cart functionality
 * Body: { quantity: number }
 */
router.put(
  "/:userId/item/:productId",
  optionalAuth,
  cartController.updateCartItem
);

/**
 * Remove specific item from cart
 * DELETE /api/cart/:userId/item/:productId
 * Optional auth - allows guest cart functionality
 */
router.delete(
  "/:userId/item/:productId",
  optionalAuth,
  cartController.removeFromCart
);

/**
 * Clear entire cart
 * DELETE /api/cart/:userId/clear
 * Optional auth - allows guest cart functionality
 */
router.delete("/:userId/clear", optionalAuth, cartController.clearCart);

/**
 * Update shipping cost
 * PUT /api/cart/:userId/shipping
 * Optional auth - allows guest cart functionality
 * Body: { shippingCost: number }
 */
router.put("/:userId/shipping", optionalAuth, cartController.updateShipping);

// ==========================================
// PROTECTED CART OPERATIONS
// ==========================================

/**
 * Validate cart items (stock, prices, availability)
 * POST /api/cart/:userId/validate
 * Requires authentication and ownership verification
 */
router.post(
  "/:userId/validate",
  protect,
  cartController.validateCart
);

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * Get cart statistics (Admin only)
 * GET /api/cart/admin/statistics
 */
router.get("/admin/statistics", protect, cartController.getCartStatistics);


module.exports = router;
