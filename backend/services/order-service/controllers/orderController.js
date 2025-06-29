const orderService = require("../services/orderService");

class OrderController {
  async createOrder(req, res) {
    try {
      const token = req.token;
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

  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

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

  async getOrderByNumber(req, res) {
    try {
      const { orderNumber } = req.params;
      const userId = req.user.id;

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

  async getUserOrders(req, res) {
    try {
      const { userId } = req.params;

      // Check if user can access these orders
      if (req.user.id !== userId && req.user.role !== "admin") {
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

  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

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

  // Admin endpoints
  async getAllOrders(req, res) {
    try {
      const options = {
        status: req.query.status,
        limit: parseInt(req.query.limit) || 50,
        skip: parseInt(req.query.skip) || 0,
        sortBy: req.query.sortBy || "createdAt",
        sortOrder: req.query.sortOrder || "desc",
      };

      const orders = await orderService.getAllOrders(options);

      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error("Get all orders error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve orders",
        error: error.message,
      });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, statusNote } = req.body;
      const adminUserId = req.user.id;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status is required",
        });
      }

      const validStatuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Valid statuses: ${validStatuses.join(
            ", "
          )}`,
        });
      }

      const order = await orderService.updateOrderStatus(
        orderId,
        status,
        statusNote,
        adminUserId
      );

      res.status(200).json({
        success: true,
        message: "Order status updated successfully",
        data: order,
      });
    } catch (error) {
      console.error("Update order status error:", error);

      const statusCode = error.message.includes("not found")
        ? 404
        : error.message.includes("Invalid status transition")
        ? 400
        : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getOrderStatistics(req, res) {
    try {
      const timeframe = req.query.timeframe || "30d";
      const groupBy = req.query.groupBy || "day";

      const stats = await orderService.getOrderStatistics(timeframe, groupBy);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get order statistics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve order statistics",
        error: error.message,
      });
    }
  }
}

/**
 * Get order for payment processing (called by Payment Service)
 */
exports.getOrderForPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.headers['x-user-id']; // From Payment Service

    const order = await orderService.getOrderForPayment(orderId, userId);

    res.status(200).json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error(`Error fetching order ${req.params.orderId}:`, error);
    res.status(error.message === "Order not found" ? 404 : 
               error.message === "Not authorized to access this order" ? 403 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update order payment status (called by Payment Service)
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const paymentData = req.body;
    const userId = req.headers['x-user-id']; // From Payment Service

    const updatedOrder = await orderService.updatePaymentStatus(
      orderId, 
      paymentData, 
      userId
    );

    res.status(200).json({
      success: true,
      message: "Order payment status updated successfully",
      data: updatedOrder
    });

  } catch (error) {
    console.error(`Error updating payment status for order ${req.params.orderId}:`, error);
    res.status(error.message === "Order not found" ? 404 : 
               error.message === "Not authorized to update this order" ? 403 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update order status (admin only)
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const updatedOrder = await orderService.updateOrderStatus(
      orderId, 
      status, 
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder
    });

  } catch (error) {
    console.error(`Error updating order status:`, error);
    res.status(error.message === "Order not found" ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get orders by payment status (admin only)
 */
exports.getOrdersByPaymentStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const { paymentStatus } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const orders = await orderService.getOrdersByPaymentStatus(paymentStatus, {
      limit,
      skip
    });

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Error fetching orders by payment status:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get order statistics (admin only)
 */
exports.getOrderStatistics = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const statistics = await orderService.getOrderStatistics();

    res.status(200).json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error("Error fetching order statistics:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = new OrderController();
