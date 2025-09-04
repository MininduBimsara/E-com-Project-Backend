// backend/services/order-service/services/orderService.js - Updated Flow
const axios = require("axios");
const orderRepository = require("../repositories/orderRepository");
const { orderEventPublisher } = require("../events/orderEventPublisher");

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
        headers.Cookie = `token=${token}`;
      }

      const response = await axios.get(`${this.cartServiceUrl}/${userId}`, {
        headers,
        timeout: 10000,
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
   * CHANGED: Do NOT clear cart immediately after order creation
   * Cart will be cleared only after successful payment via events
   */
  async clearCartAfterPayment(userId, token) {
    try {
      const headers = {};
      if (token) {
        headers.Cookie = `token=${token}`;
      }

      await axios.delete(`${this.cartServiceUrl}/${userId}/clear`, {
        headers,
        timeout: 10000,
      });

      console.log(`✅ Cart cleared after payment for user: ${userId}`);
    } catch (error) {
      console.warn(
        `⚠️ Failed to clear cart for user ${userId}:`,
        error.message
      );
      // This is now handled by events, so this method might be deprecated
    }
  }

  /**
   * Validate cart before creating order
   */
  async validateCartForOrder(userId, token) {
    try {
      const headers = {};
      if (token) {
        headers.Cookie = `token=${token}`;
      }

      const response = await axios.post(
        `${this.cartServiceUrl}/${userId}/validate`,
        {},
        {
          headers,
          timeout: 10000,
        }
      );

      const validationData = response.data.data || response.data;

      return {
        valid: validationData.valid !== false,
        issues: validationData.invalidItems || validationData.issues || [],
        message: validationData.message || "Cart validation completed",
      };
    } catch (error) {
      console.error("Cart validation failed:", error.message);
      throw new Error(`Cart validation failed: ${error.message}`);
    }
  }

  /**
   * Create a new order (CHANGED: Don't clear cart here)
   */
  async createOrder(orderData, userId, token) {
    const { shippingAddress, paymentMethod } = orderData;

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

    // Prepare order items
    const orderItems = cart.items.map((cartItem) => ({
      productId: cartItem.productId,
      quantity: cartItem.quantity,
      priceAtOrder: cartItem.priceAtAdd,
      productName: cartItem.product?.name || `Product ${cartItem.productId}`,
      productImageUrl: cartItem.product?.imageUrl || null,
    }));

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
      paymentMethod: paymentMethod || "pending",
      paymentStatus: "pending", // Always start as pending
      status: "pending", // Order status starts as pending
    };

    // Create order
    const order = await orderRepository.createOrder(newOrderData);

 try {
   const { orderEventPublisher } = require("../events/orderEventPublisher");
   await orderEventPublisher.publishOrderCreated(order);
   console.log(`📤 Order created event published: ${order.orderNumber}`);
 } catch (error) {
   console.warn("Failed to publish order created event:", error.message);
 }

    console.log(`✅ Order created successfully: ${order.orderNumber}`, {
      orderId: order._id,
      userId,
      total: order.total,
      itemCount: orderItems.length,
      cartStatus: "preserved_for_payment",
    });

    return order;
  }

  /**
   * Update order payment status (called when payment is confirmed)
   */
  async confirmOrderPayment(orderId, paymentData, userId = null) {
    const order = await orderRepository.findOrderById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    if (userId && order.userId !== userId) {
      throw new Error("Not authorized to update this order");
    }

    const { paymentStatus, paymentId, paymentMethod, transactionId } =
      paymentData;

    const updateData = {
      paymentStatus: paymentStatus || "paid",
      status: "confirmed", // Update order status to confirmed
      paymentId: paymentId,
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      paymentCompletedAt: new Date(),
    };

    const updatedOrder = await orderRepository.updateOrderById(
      orderId,
      updateData
    );

    console.log(`🎉 Order payment confirmed: ${order.orderNumber}`, {
      orderId,
      paymentId,
      transactionId,
      userId: userId || "system",
    });

    return updatedOrder;
  }

  /**
   * Cancel order and optionally restore cart
   */
  async cancelOrder(orderId, userId, reason = "user_cancelled") {
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

    // Update order status
    const cancelledOrder = await orderRepository.updateOrderById(orderId, {
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: reason,
    });

    // Publish order cancelled event
    try {
      await rabbitmqManager.publishEvent(
        EVENT_TYPES.ORDER_CANCELLED,
        {
          orderId: orderId,
          userId: userId,
          reason: reason,
          cancelledAt: new Date().toISOString(),
          orderItems: order.items,
        },
        {
          source: "order-service",
          version: "1.0",
        }
      );
    } catch (error) {
      console.warn("Failed to publish order cancelled event:", error.message);
    }

    return cancelledOrder;
  }

  // ... rest of the methods remain the same
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

  async getUserOrders(userId, options = {}) {
    const queryOptions = {
      status: options.status,
      limit: parseInt(options.limit) || 50,
      skip: parseInt(options.skip) || 0,
      sort: { createdAt: -1 },
    };
    return await orderRepository.findOrdersByUserId(userId, queryOptions);
  }

  async getOrderForPayment(orderId, userId = null) {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    if (userId && order.userId !== userId) {
      throw new Error("Not authorized to access this order");
    }
    return order;
  }

  async updatePaymentStatus(orderId, paymentData, userId = null) {
    return await this.confirmOrderPayment(orderId, paymentData, userId);
  }

  async getOrderStatistics() {
    return await orderRepository.getOrderStatistics();
  }
}

module.exports = new OrderService();
