// ==============================================
// services/orderService.js - Updated with Payment Integration
// ==============================================

const axios = require("axios");
const orderRepository = require("../repositories/orderRepository");

/**
 * Order Service - Business logic for order operations
 */
class OrderService {
  constructor() {
    this.cartServiceUrl =
      process.env.CART_SERVICE_URL || "http://localhost:4002";
    this.productServiceUrl =
      process.env.PRODUCT_SERVICE_URL || "http://localhost:4001";
  }

  /**
   * Get cart data from cart service
   */
  async getCartData(userId, token) {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.get(`${this.cartServiceUrl}/${userId}`, {
        headers,
      });
      return response.data.data || response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("Cart not found");
      }
      throw new Error(`Failed to fetch cart: ${error.message}`);
    }
  }

  /**
   * Clear cart after successful order
   */
  async clearCart(userId, token) {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await axios.delete(`${this.cartServiceUrl}/${userId}/clear`, {
        headers,
      });
    } catch (error) {
      console.warn(`Failed to clear cart for user ${userId}:`, error.message);
    }
  }

  /**
   * Get product details from product service
   */
  async getProductDetails(productId, token) {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.get(
        `${this.productServiceUrl}/details/${productId}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.warn(
        `Failed to fetch product details for ${productId}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Validate cart items before creating order
   */
  async validateCartForOrder(userId, token) {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.post(
        `${this.cartServiceUrl}/${userId}/validate`,
        {},
        { headers }
      );
      return response.data.data || response.data;
    } catch (error) {
      throw new Error(`Cart validation failed: ${error.message}`);
    }
  }

  /**
   * Create a new order
   */
  async createOrder(orderData, token) {
    const { userId, shippingAddress, paymentId } = orderData;

    if (!userId || !shippingAddress) {
      throw new Error("User ID and shipping address are required");
    }

    // Validate shipping address
    if (
      !shippingAddress.street ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.zipCode
    ) {
      throw new Error("Complete shipping address is required");
    }

    // Validate cart before creating order
    const validation = await this.validateCartForOrder(userId, token);
    if (!validation.valid) {
      throw new Error(
        `Cart validation failed: ${validation.issues
          .map((i) => i.message)
          .join(", ")}`
      );
    }

    // Get cart data
    const cart = await this.getCartData(userId, token);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Prepare order items with product details
    const orderItems = [];
    for (const cartItem of cart.items) {
      const productDetails =
        cartItem.product ||
        (await this.getProductDetails(cartItem.productId, token));

      orderItems.push({
        productId: cartItem.productId,
        quantity: cartItem.quantity,
        priceAtOrder: cartItem.priceAtAdd,
        productName: productDetails?.name || `Product ${cartItem.productId}`,
        productImageUrl: productDetails?.imageUrl || null,
      });
    }

    // Generate order number
    const orderNumber = require("../models/Order").generateOrderNumber();

    // Create order data
    const newOrderData = {
      userId,
      orderNumber,
      items: orderItems,
      subtotal: cart.subtotal || 0,
      shipping: cart.shipping || 0,
      total: (cart.subtotal || 0) + (cart.shipping || 0),
      currency: cart.currency || "USD",
      shippingAddress,
      paymentId: paymentId || null,
      paymentStatus: paymentId ? "paid" : "pending",
    };

    // Create order
    const order = await orderRepository.createOrder(newOrderData);

    // Clear cart after successful order creation
    await this.clearCart(userId, token);

    return order;
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId, userId) {
    const order = await orderRepository.findOrderById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.userId !== userId) {
      throw new Error("Access denied");
    }

    return order;
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber, userId) {
    const order = await orderRepository.findOrderByNumber(orderNumber);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.userId !== userId) {
      throw new Error("Access denied");
    }

    return order;
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId, options = {}) {
    const queryOptions = {
      status: options.status,
      limit: parseInt(options.limit) || 50,
      skip: parseInt(options.skip) || 0,
      sort: { createdAt: -1 },
    };

    return await orderRepository.findOrdersByUserId(userId, queryOptions);
  }

  /**
   * Cancel order (only pending or confirmed orders)
   */
  async cancelOrder(orderId, userId) {
    const order = await orderRepository.findOrderById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.userId !== userId) {
      throw new Error("Access denied");
    }

    if (!["pending", "confirmed"].includes(order.status)) {
      throw new Error("Order cannot be cancelled in current status");
    }

    return await orderRepository.updateOrderById(orderId, {
      status: "cancelled",
    });
  }

  // ===============================
  // NEW PAYMENT INTEGRATION METHODS
  // ===============================

  /**
   * Get order for payment processing (called by Payment Service)
   * @param {String} orderId - Order ID
   * @param {String} userId - User ID (optional for service calls)
   */
  async getOrderForPayment(orderId, userId = null) {
    const order = await orderRepository.findOrderById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify ownership if userId provided
    if (userId && order.userId !== userId) {
      throw new Error("Not authorized to access this order");
    }

    return order;
  }

  /**
   * Update order payment status (called by Payment Service)
   * @param {String} orderId - Order ID
   * @param {Object} paymentData - Payment information
   * @param {String} userId - User ID (optional for service calls)
   */
  async updatePaymentStatus(orderId, paymentData, userId = null) {
    const order = await orderRepository.findOrderById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify ownership if userId provided
    if (userId && order.userId !== userId) {
      throw new Error("Not authorized to update this order");
    }

    const { paymentStatus, status, paymentId, paymentMethod } = paymentData;

    const updateData = {
      paymentStatus: paymentStatus,
      paymentId: paymentId,
      paymentMethod: paymentMethod,
    };

    // Update main status if provided
    if (status) {
      updateData.status = status;
    }

    // Add payment completion timestamp
    if (paymentStatus === "paid") {
      updateData.paymentCompletedAt = new Date();
    }

    const updatedOrder = await orderRepository.updateOrderById(
      orderId,
      updateData
    );

    // Log the payment confirmation
    console.log(`Order ${orderId} payment status updated:`, {
      paymentStatus,
      paymentId,
      paymentMethod,
      userId: userId || "system",
    });

    return updatedOrder;
  }

  /**
   * Get order with payment details
   * @param {String} orderId - Order ID
   */
  async getOrderWithPaymentDetails(orderId) {
    return await orderRepository.findOrderById(orderId);
  }

  /**
   * Update order status (for admin operations)
   * @param {String} orderId - Order ID
   * @param {String} status - New status
   * @param {String} adminUserId - Admin user ID
   */
  async updateOrderStatus(orderId, status, adminUserId) {
    const order = await orderRepository.findOrderById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      throw new Error("Invalid order status");
    }

    const updatedOrder = await orderRepository.updateOrderById(orderId, {
      status: status,
      updatedBy: adminUserId,
    });

    console.log(
      `Order ${orderId} status updated to ${status} by admin ${adminUserId}`
    );

    return updatedOrder;
  }

  /**
   * Get orders by payment status (for admin)
   * @param {String} paymentStatus - Payment status
   * @param {Object} options - Query options
   */
  async getOrdersByPaymentStatus(paymentStatus, options = {}) {
    const queryOptions = {
      filter: { paymentStatus },
      limit: parseInt(options.limit) || 50,
      skip: parseInt(options.skip) || 0,
      sort: { createdAt: -1 },
    };

    return await orderRepository.findOrdersWithFilter(queryOptions);
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics() {
    return await orderRepository.getOrderStatistics();
  }
}

module.exports = new OrderService();
