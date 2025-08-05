const cartService = require("../services/cartService");

class CartController {
  async getCart(req, res) {
    try {
      const { userId } = req.params;
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

  // Add debugging to cartController.js addToCart method
  async addToCart(req, res) {
    try {
      const { userId } = req.params;
      const { productId, quantity = 1 } = req.body;

      console.log("=== CART CONTROLLER DEBUG ===");
      console.log("Headers received:", JSON.stringify(req.headers, null, 2));
      console.log("Cookies received:", req.cookies);
      console.log("req.token from middleware:", req.token);

      // Get token from middleware, cookie, or Authorization header
      const token =
        req.token ||
        req.cookies.token ||
        (req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
          ? req.headers.authorization.split(" ")[1]
          : null);

      console.log(
        "Final extracted token:",
        token ? `${token.substring(0, 20)}...` : "NULL"
      );
      console.log("==============================");

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

  async updateCartItem(req, res) {
    try {
      const { userId, productId } = req.params;
      const { quantity } = req.body;
      const token = req.token;

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

  async removeFromCart(req, res) {
    try {
      const { userId, productId } = req.params;
      const token = req.token;

      const cart = await cartService.removeFromCart(userId, productId, token);

      res.status(200).json({
        success: true,
        message: "Item removed from cart successfully",
        data: cart,
      });
    } catch (error) {
      console.error("Remove from cart error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

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
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async validateCart(req, res) {
    try {
      const { userId } = req.params;
      const token = req.token;

      // Check if user can access this cart
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
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getCartStatistics(req, res) {
    try {
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
