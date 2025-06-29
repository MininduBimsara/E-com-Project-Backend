// ==============================================
// repositories/orderRepository.js
// ==============================================

const Order = require("../models/Order");

/**
 * Order Repository - Handles database operations for Order model
 */
class OrderRepository {
  /**
   * Create a new order
   */
  async createOrder(orderData) {
    const order = new Order(orderData);
    return await order.save();
  }

  /**
   * Find order by ID
   */
  async findOrderById(orderId) {
    return await Order.findById(orderId);
  }

  /**
   * Find order by order number
   */
  async findOrderByNumber(orderNumber) {
    return await Order.findOne({ orderNumber });
  }

  /**
   * Find orders by user ID
   */
  async findOrdersByUserId(userId, options = {}) {
    let query = Order.find({ userId });

    if (options.status) {
      query = query.where({ status: options.status });
    }

    if (options.sort) {
      query = query.sort(options.sort);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.skip) {
      query = query.skip(options.skip);
    }

    return await query;
  }

  /**
   * Update order by ID
   */
  async updateOrderById(orderId, updateData) {
    return await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * Count orders by user ID
   */
  async countOrdersByUserId(userId) {
    return await Order.countDocuments({ userId });
  }

  /**
 * Find orders with filter (for payment status queries)
 * @param {Object} options - Query options with filter
 * @returns {Array} Array of orders
 */
async findOrdersWithFilter(options = {}) {
  let query = Order.find(options.filter || {});

  if (options.sort) {
    query = query.sort(options.sort);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.skip) {
    query = query.skip(options.skip);
  }

  return await query;
}

/**
 * Get order statistics
 * @returns {Object} Order statistics
 */
async getOrderStatistics() {
  const pipeline = [
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$total" },
        
        // Order status counts
        pendingOrders: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
        },
        confirmedOrders: {
          $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] }
        },
        processingOrders: {
          $sum: { $cond: [{ $eq: ["$status", "processing"] }, 1, 0] }
        },
        shippedOrders: {
          $sum: { $cond: [{ $eq: ["$status", "shipped"] }, 1, 0] }
        },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
        },

        // Payment status counts
        paidOrders: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] }
        },
        pendingPayments: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] }
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "failed"] }, 1, 0] }
        },

        // Payment method counts
        paypalOrders: {
          $sum: { $cond: [{ $eq: ["$paymentMethod", "paypal"] }, 1, 0] }
        },

        // Financial metrics
        averageOrderValue: { $avg: "$total" },
        paidRevenue: {
          $sum: {
            $cond: [
              { $eq: ["$paymentStatus", "paid"] },
              "$total",
              0
            ]
          }
        }
      }
    }
  ];

  const result = await Order.aggregate(pipeline);
  return result[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    paidOrders: 0,
    pendingPayments: 0,
    failedPayments: 0,
    paypalOrders: 0,
    averageOrderValue: 0,
    paidRevenue: 0
  };
}

/**
 * Update order payment details
 * @param {String} orderId - Order ID
 * @param {Object} paymentData - Payment data
 * @returns {Object} Updated order
 */
async updatePaymentDetails(orderId, paymentData) {
  const updateData = {
    ...paymentData,
    updatedAt: new Date(),
  };

  // Set payment timestamp if status is paid
  if (paymentData.paymentStatus === "paid" && !paymentData.paymentCompletedAt) {
    updateData.paymentCompletedAt = new Date();
  }

  return await Order.findByIdAndUpdate(orderId, updateData, {
    new: true,
    runValidators: true,
  });
}

/**
 * Find orders by payment status
 * @param {String} paymentStatus - Payment status
 * @param {Object} options - Query options
 * @returns {Array} Array of orders
 */
async findOrdersByPaymentStatus(paymentStatus, options = {}) {
  return await this.findOrdersWithFilter({
    filter: { paymentStatus },
    ...options
  });
}
}



module.exports = new OrderRepository();
