const orderService = require("../services/orderService");

/**
 * Updated Order Controller - Works with centralized auth middleware
 */
class OrderController {
  /**
   * Create a new order
   * POST /api/orders
   */
  async createOrder(req, res) {
    try {
      const token = req.token; // From middleware (optional auth)

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
      const userId = req.user.id; // From middleware (required auth)

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
      const userId = req.user.id; // From middleware (required auth)

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
      // Middleware already verified ownership or admin role

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
      const userId = req.user.id; // From middleware (required auth)

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

  /**
   * Get all orders (Admin only)
   * GET /api/orders/admin/all
   */
  async getAllOrders(req, res) {
    try {
      // Middleware already verified admin role
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

  /**
   * Update order status (Admin only)
   * PUT /api/orders/admin/:orderId/status
   */
  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status, statusNote } = req.body;
      const adminUserId = req.user.id; // From middleware (admin auth)

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

  /**
   * Get order statistics (Admin only)
   * GET /api/orders/admin/statistics
   */
  async getOrderStatistics(req, res) {
    try {
      // Middleware already verified admin role
      const timeframe = req.query.timeframe || "30d"; // 7d, 30d, 90d, 1y
      const groupBy = req.query.groupBy || "day"; // day, week, month

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

  /**
   * Export orders to CSV (Admin only)
   * GET /api/orders/admin/export
   */
  async exportOrders(req, res) {
    try {
      // Middleware already verified admin role
      const options = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status,
        format: req.query.format || "csv", // csv, xlsx
      };

      const exportData = await orderService.exportOrders(options);

      // Set appropriate headers for file download
      const filename = `orders_export_${
        new Date().toISOString().split("T")[0]
      }.${options.format}`;

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader(
        "Content-Type",
        options.format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv"
      );

      res.status(200).send(exportData);
    } catch (error) {
      console.error("Export orders error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export orders",
        error: error.message,
      });
    }
  }

  /**
   * Get order details for admin view (includes sensitive info)
   * GET /api/orders/admin/:orderId
   */
  async getOrderForAdmin(req, res) {
    try {
      const { orderId } = req.params;
      // Middleware already verified admin role

      const order = await orderService.getOrderForAdmin(orderId);

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error("Get order for admin error:", error);

      const statusCode = error.message.includes("not found") ? 404 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Bulk update orders (Admin only)
   * PUT /api/orders/admin/bulk-update
   */
  async bulkUpdateOrders(req, res) {
    try {
      const { orderIds, action, data } = req.body;
      const adminUserId = req.user.id; // From middleware (admin auth)

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order IDs array is required",
        });
      }

      if (!action) {
        return res.status(400).json({
          success: false,
          message: "Action is required",
        });
      }

      const validActions = ["updateStatus", "cancel", "refund", "addNote"];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          message: `Invalid action. Valid actions: ${validActions.join(", ")}`,
        });
      }

      const result = await orderService.bulkUpdateOrders(
        orderIds,
        action,
        data,
        adminUserId
      );

      res.status(200).json({
        success: true,
        message: `Bulk ${action} completed`,
        data: result,
      });
    } catch (error) {
      console.error("Bulk update orders error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to perform bulk update",
        error: error.message,
      });
    }
  }
}

module.exports = new OrderController();
