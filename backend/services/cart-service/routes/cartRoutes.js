const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

// Middleware for parsing JSON (if not set globally)
router.use(express.json());


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
// router.use("*", (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Cart API route not found: ${req.method} ${req.originalUrl}`,
//     availableEndpoints: [
//       "GET /:userId - Get cart",
//       "GET /:userId/summary - Get cart summary",
//       "GET /:userId/count - Get items count",
//       "POST /:userId/add - Add item",
//       "PUT /:userId/item/:productId - Update item",
//       "DELETE /:userId/item/:productId - Remove item",
//       "DELETE /:userId/clear - Clear cart",
//       "PUT /:userId/shipping - Update shipping",
//       "POST /:userId/validate - Validate cart",
//     ],
//   });
// });

// // Global error handler for cart routes
// router.use((error, req, res, next) => {
//   console.error("Cart route error:", error);

//   // Handle different types of errors
//   if (error.name === "ValidationError") {
//     return res.status(400).json({
//       success: false,
//       message: "Validation error",
//       error: error.message,
//     });
//   }

//   if (error.name === "CastError") {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid ID format",
//       error: error.message,
//     });
//   }

//   // Default server error
//   res.status(500).json({
//     success: false,
//     message: "Internal server error in cart service",
//     error:
//       process.env.NODE_ENV === "production"
//         ? "Something went wrong"
//         : error.message,
//   });
// });

module.exports = router;
