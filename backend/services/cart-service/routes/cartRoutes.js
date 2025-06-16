const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

// Middleware for parsing JSON (if not set globally)
router.use(express.json());

// Health check
router.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    service: "Simple Cart Service",
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// BASIC CART OPERATIONS
// ==========================================

/**
 * Get user's cart with full product details
 * GET /api/cart/:userId
 */
router.get("/:userId", cartController.getCart);

/**
 * Get lightweight cart summary
 * GET /api/cart/:userId/summary
 */
router.get("/:userId/summary", cartController.getCartSummary);

/**
 * Get cart items count
 * GET /api/cart/:userId/count
 */
router.get("/:userId/count", cartController.getCartCount);

/**
 * Add item to cart
 * POST /api/cart/:userId/add
 * Body: { productId: string, quantity: number }
 */
router.post("/:userId/add", cartController.addToCart);

/**
 * Update item quantity in cart
 * PUT /api/cart/:userId/item/:productId
 * Body: { quantity: number }
 */
router.put("/:userId/item/:productId", cartController.updateCartItem);

/**
 * Remove specific item from cart
 * DELETE /api/cart/:userId/item/:productId
 */
router.delete("/:userId/item/:productId", cartController.removeFromCart);

/**
 * Clear entire cart
 * DELETE /api/cart/:userId/clear
 */
router.delete("/:userId/clear", cartController.clearCart);

/**
 * Update shipping cost
 * PUT /api/cart/:userId/shipping
 * Body: { shippingCost: number }
 */
router.put("/:userId/shipping", cartController.updateShipping);

/**
 * Validate cart items (stock, prices, availability)
 * POST /api/cart/:userId/validate
 */
router.post("/:userId/validate", cartController.validateCart);

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * Get cart statistics (Admin only)
 * GET /api/cart/admin/statistics
 */
router.get("/admin/statistics", cartController.getCartStatistics);

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================

// Handle 404 for unmatched routes
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cart API route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      "GET /:userId - Get cart",
      "GET /:userId/summary - Get cart summary", 
      "GET /:userId/count - Get items count",
      "POST /:userId/add - Add item",
      "PUT /:userId/item/:productId - Update item",
      "DELETE /:userId/item/:productId - Remove item",
      "DELETE /:userId/clear - Clear cart",
      "PUT /:userId/shipping - Update shipping",
      "POST /:userId/validate - Validate cart",
      "GET /admin/statistics - Get cart statistics (Admin only)"
    ]
  });
});

// Optional: General error handler (for unexpected errors)
router.use((err, req, res, next) => {
  console.error("Cart API Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error in Cart API.",
    error: err.message || "Unknown error"
  });
});

module.exports = router;
//