// ==============================================
// repositories/orderRepository.js
// ==============================================

const Order = require("../models/Payment");

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
}

module.exports = new OrderRepository();
