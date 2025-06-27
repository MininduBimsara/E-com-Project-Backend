// ==============================================
// controllers/orderController.js
// ==============================================

const orderService = require("../services/orderService");

/**
 * Order Controller - Handles HTTP requests for order operations
 */
class OrderController {
  /**
   * Create a new order
   * POST /api/orders
   */
  async createOrder(req, res) {
    try {
      const token =
        req.header("Authorization")?.replace("Bearer ", "") ||
        req.cookies?.token;

      const order = await orderService.createOrder(req.body, token);

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: order,
      });
    } catch (error) {
      console.error("Create order error:", error);

      const statusCode =
        error.message.includes("required") ||
        error.message.includes("validation failed") ||
        error.message.includes("empty")
          ? 400
          : error.message.includes("not found")
          ? 404
          : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get order by ID
   * GET /api/orders/:orderId
   */
  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const order = await orderService.getOrderById(orderId, userId);

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error("Get order error:", error);

      const statusCode = error.message.includes("not found")
        ? 404
        : error.message.includes("Access denied")
        ? 403
        : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get order by order number
   * GET /api/orders/number/:orderNumber
   */
  async getOrderByNumber(req, res) {
    try {
      const { orderNumber } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const order = await orderService.getOrderByNumber(orderNumber, userId);

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error("Get order by number error:", error);

      const statusCode = error.message.includes("not found")
        ? 404
        : error.message.includes("Access denied")
        ? 403
        : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get user's orders
   * GET /api/orders/user/:userId
   */
  async getUserOrders(req, res) {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.id;

      if (!requestingUserId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (userId !== requestingUserId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      const options = {
        status: req.query.status,
        limit: req.query.limit,
        skip: req.query.skip,
      };

      const orders = await orderService.getUserOrders(userId, options);

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error("Get user orders error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve orders",
        error: error.message,
      });
    }
  }

  /**
   * Cancel order
   * PUT /api/orders/:orderId/cancel
   */
  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const order = await orderService.cancelOrder(orderId, userId);

      res.status(200).json({
        success: true,
        message: "Order cancelled successfully",
        data: order,
      });
    } catch (error) {
      console.error("Cancel order error:", error);

      const statusCode = error.message.includes("not found")
        ? 404
        : error.message.includes("Access denied")
        ? 403
        : error.message.includes("cannot be cancelled")
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new OrderController();
