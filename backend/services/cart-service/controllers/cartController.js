const cartService = require("../services/cartService");

/**
 * Updated Cart Controller - Works with centralized auth middleware
 */
class CartController {
  /**
   * Get user's cart
   * GET /api/cart/:userId
   */
  async getCart(req, res) {
    try {
      const { userId } = req.params;

      // Token is automatically extracted by middleware and available as req.token
      const token = req.token;

      const cart = await cartService.getCart(userId, token);

      res.status(200).json({
        success: true,
        data: cart,
      });
    } catch (error) {
      console.error("Get cart error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve cart",
        error: error.message,
      });
    }
  }

  /**
   * Get cart summary (lightweight)
   * GET /api/cart/:userId/summary
   */
  async getCartSummary(req, res) {
    try {
      const { userId } = req.params;

      const summary = await cartService.getCartSummary(userId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("Get cart summary error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve cart summary",
        error: error.message,
      });
    }
  }

  /**
   * Add item to cart
   * POST /api/cart/:userId/add
   */
  async addToCart(req, res) {
    try {
      const { userId } = req.params;
      const { productId, quantity = 1 } = req.body;
      const token = req.token; // From middleware

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a positive integer",
        });
      }

      const cart = await cartService.addToCart(
        userId,
        productId,
        quantity,
        token
      );

      res.status(200).json({
        success: true,
        message: "Item added to cart successfully",
        data: cart,
      });
    } catch (error) {
      console.error("Add to cart error:", error);

      const statusCode = error.message.includes("not found")
        ? 404
        : error.message.includes("not available") ||
          error.message.includes("Insufficient stock")
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Update item quantity in cart
   * PUT /api/cart/:userId/item/:productId
   */
  async updateCartItem(req, res) {
    try {
      const { userId, productId } = req.params;
      const { quantity } = req.body;
      const token = req.token; // From middleware

      if (!Number.isInteger(quantity) || quantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a non-negative integer",
        });
      }

      const cart = await cartService.updateCartItem(
        userId,
        productId,
        quantity,
        token
      );

      res.status(200).json({
        success: true,
        message:
          quantity > 0
            ? "Item quantity updated successfully"
            : "Item removed from cart",
        data: cart,
      });
    } catch (error) {
      console.error("Update cart item error:", error);

      const statusCode = error.message.includes("not found")
        ? 404
        : error.message.includes("Insufficient stock")
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Remove item from cart
   * DELETE /api/cart/:userId/item/:productId
   */
  async removeFromCart(req, res) {
    try {
      const { userId, productId } = req.params;
      const token = req.token; // From middleware

      const cart = await cartService.removeFromCart(userId, productId, token);

      res.status(200).json({
        success: true,
        message: "Item removed from cart successfully",
        data: cart,
      });
    } catch (error) {
      console.error("Remove from cart error:", error);

      const statusCode = error.message.includes("not found") ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Clear entire cart
   * DELETE /api/cart/:userId/clear
   */
  async clearCart(req, res) {
    try {
      const { userId } = req.params;

      const result = await cartService.clearCart(userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Clear cart error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to clear cart",
        error: error.message,
      });
    }
  }

  /**
   * Get cart items count
   * GET /api/cart/:userId/count
   */
  async getCartCount(req, res) {
    try {
      const { userId } = req.params;

      const count = await cartService.getCartItemsCount(userId);

      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error("Get cart count error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get cart count",
        error: error.message,
      });
    }
  }

  /**
   * Update shipping cost
   * PUT /api/cart/:userId/shipping
   */
  async updateShipping(req, res) {
    try {
      const { userId } = req.params;
      const { shippingCost = 0 } = req.body;

      const cart = await cartService.updateShipping(userId, shippingCost);

      res.status(200).json({
        success: true,
        message: "Shipping cost updated successfully",
        data: cart,
      });
    } catch (error) {
      console.error("Update shipping error:", error);

      const statusCode = error.message.includes("not found") ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Validate cart
   * POST /api/cart/:userId/validate
   */
  async validateCart(req, res) {
    try {
      const { userId } = req.params;
      const token = req.token; // From middleware

      // Additional security check - ensure user is accessing their own cart
      if (req.user && req.user.id !== userId && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const result = await cartService.validateCart(userId, token);

      res.status(200).json({
        success: true,
        message: "Cart validation completed",
        data: result,
      });
    } catch (error) {
      console.error("Validate cart error:", error);

      const statusCode = error.message.includes("not found") ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Admin endpoints

  /**
   * Get cart statistics (Admin only)
   * GET /api/cart/admin/statistics
   */
  async getCartStatistics(req, res) {
    try {
      // Middleware already verified admin role
      const stats = await cartService.getCartStatistics();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get cart statistics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve cart statistics",
        error: error.message,
      });
    }
  }
}

module.exports = new CartController();
