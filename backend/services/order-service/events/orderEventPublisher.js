// backend/services/order-service/events/orderEventPublisher.js
const {
  rabbitmqManager,
  EVENT_TYPES,
} = require("../../../shared/utils/rabbitmq");

class OrderEventPublisher {
  constructor() {
    this.serviceName = "order-service";
  }

  async publishOrderCreated(orderData) {
    try {
      const eventData = {
        orderId: orderData._id || orderData.id,
        orderNumber: orderData.orderNumber,
        userId: orderData.userId,
        items: orderData.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          priceAtOrder: item.priceAtOrder,
          productName: item.productName,
        })),
        subtotal: orderData.subtotal,
        shipping: orderData.shipping,
        total: orderData.total,
        currency: orderData.currency || "USD",
        shippingAddress: orderData.shippingAddress,
        paymentMethod: orderData.paymentMethod,
        status: orderData.status,
        createdAt: orderData.createdAt || new Date().toISOString(),
      };

      const correlationId = await rabbitmqManager.publishEvent(
        EVENT_TYPES.ORDER_CREATED,
        eventData,
        {
          source: this.serviceName,
          version: "1.0",
        }
      );

      console.log(`📤 [OrderEventPublisher] Order created event published:`, {
        orderId: eventData.orderId,
        orderNumber: eventData.orderNumber,
        userId: eventData.userId,
        total: eventData.total,
        itemCount: eventData.items.length,
        correlationId,
      });

      return correlationId;
    } catch (error) {
      console.error(
        `❌ [OrderEventPublisher] Failed to publish order created event:`,
        error.message
      );
      return null;
    }
  }
}

const orderEventPublisher = new OrderEventPublisher();
module.exports = { orderEventPublisher };

// backend/services/order-service/events/orderEventConsumer.js
const {
  rabbitmqManager,
  EVENT_TYPES,
} = require("../../../shared/utils/rabbitmq");
const orderRepository = require("../repositories/orderRepository");

class OrderEventConsumer {
  constructor() {
    this.serviceName = "order-service";
  }

  async initialize() {
    try {
      const routingKeys = [
        EVENT_TYPES.PAYMENT_SUCCESS,
        EVENT_TYPES.PAYMENT_FAILED,
      ];

      await rabbitmqManager.setupConsumer(
        this.serviceName,
        routingKeys,
        this.handleMessage.bind(this),
        {
          prefetch: 5,
          queueArguments: {
            "x-max-retries": 3,
          },
        }
      );

      console.log(
        `👂 [OrderEventConsumer] Consumer initialized for events: ${routingKeys.join(
          ", "
        )}`
      );
    } catch (error) {
      console.error(
        `❌ [OrderEventConsumer] Failed to initialize consumer:`,
        error.message
      );
      throw error;
    }
  }

  async handleMessage(message, routingKey) {
    try {
      console.log(`📥 [OrderEventConsumer] Processing event: ${routingKey}`, {
        correlationId: message.metadata?.correlationId,
        source: message.metadata?.source,
      });

      switch (routingKey) {
        case EVENT_TYPES.PAYMENT_SUCCESS:
          await this.handlePaymentSuccess(message.data);
          break;
        case EVENT_TYPES.PAYMENT_FAILED:
          await this.handlePaymentFailed(message.data);
          break;
        default:
          console.warn(
            `⚠️ [OrderEventConsumer] Unknown event type: ${routingKey}`
          );
      }
    } catch (error) {
      console.error(
        `❌ [OrderEventConsumer] Error processing ${routingKey}:`,
        error.message
      );
      throw error;
    }
  }

  async handlePaymentSuccess(paymentData) {
    try {
      console.log(`💳 [OrderEventConsumer] Processing payment success:`, {
        orderId: paymentData.orderId,
        paymentId: paymentData.paymentId,
        amount: paymentData.amount,
      });

      const updateData = {
        paymentStatus: "paid",
        status: "confirmed",
        paymentId: paymentData.paymentId || paymentData.transactionId,
        paymentMethod: paymentData.paymentMethod,
        paymentCompletedAt: new Date(),
      };

      const updatedOrder = await orderRepository.updateOrderById(
        paymentData.orderId,
        updateData
      );

      if (!updatedOrder) {
        throw new Error(`Order not found: ${paymentData.orderId}`);
      }

      console.log(
        `✅ [OrderEventConsumer] Order updated after payment success:`,
        {
          orderId: paymentData.orderId,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
        }
      );
    } catch (error) {
      console.error(
        `❌ [OrderEventConsumer] Failed to handle payment success:`,
        error.message
      );
      throw error;
    }
  }

  async handlePaymentFailed(paymentData) {
    try {
      console.log(`💳 [OrderEventConsumer] Processing payment failure:`, {
        orderId: paymentData.orderId,
        errorReason: paymentData.errorReason,
      });

      const updateData = {
        paymentStatus: "failed",
        status: "cancelled",
        paymentFailureReason: paymentData.errorReason || paymentData.errorCode,
        paymentFailedAt: new Date(),
      };

      const updatedOrder = await orderRepository.updateOrderById(
        paymentData.orderId,
        updateData
      );

      if (!updatedOrder) {
        throw new Error(`Order not found: ${paymentData.orderId}`);
      }

      console.log(
        `✅ [OrderEventConsumer] Order updated after payment failure:`,
        {
          orderId: paymentData.orderId,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          reason: paymentData.errorReason,
        }
      );
    } catch (error) {
      console.error(
        `❌ [OrderEventConsumer] Failed to handle payment failure:`,
        error.message
      );
      throw error;
    }
  }
}

const orderEventConsumer = new OrderEventConsumer();
module.exports = { orderEventConsumer };

// backend/services/order-service/services/orderService.js (Updated)
const axios = require("axios");
const orderRepository = require("../repositories/orderRepository");
const { orderEventPublisher } = require("../events/orderEventPublisher");

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
   * Clear cart after successful order (via REST for now, will be handled by events)
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

  async validateCartForOrder(userId, token) {
    try {
      const headers = {};
      if (token) {
        headers.Cookie = `token=${token}`;
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
  async createOrder(orderData, userId, token) {
    const { shippingAddress, paymentId } = orderData;

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

    // Publish order created event
    try {
      await orderEventPublisher.publishOrderCreated(order);
      console.log(
        `📤 [OrderService] Order created event published for order: ${order._id}`
      );
    } catch (error) {
      console.error(
        `❌ [OrderService] Failed to publish order created event:`,
        error.message
      );
      // Continue - don't fail order creation if event fails
    }

    // Note: Cart clearing and stock updates will be handled by event consumers
    // But we still clear cart via REST as fallback
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

  /**
   * Get order for payment processing (called by Payment Service)
   */
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

  /**
   * Update order payment status (called by Payment Service or events)
   */
  async updatePaymentStatus(orderId, paymentData, userId = null) {
    const order = await orderRepository.findOrderById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    if (userId && order.userId !== userId) {
      throw new Error("Not authorized to update this order");
    }

    const { paymentStatus, status, paymentId, paymentMethod } = paymentData;

    const updateData = {
      paymentStatus: paymentStatus,
      paymentId: paymentId,
      paymentMethod: paymentMethod,
    };

    if (status) {
      updateData.status = status;
    }

    if (paymentStatus === "paid") {
      updateData.paymentCompletedAt = new Date();
    }

    const updatedOrder = await orderRepository.updateOrderById(
      orderId,
      updateData
    );

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
   */
  async getOrderWithPaymentDetails(orderId) {
    return await orderRepository.findOrderById(orderId);
  }

  /**
   * Update order status (for admin operations)
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

// backend/services/order-service/server.js (Updated)
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

dotenv.config();

const orderRoutes = require("./routes/orderRoutes");
const { rabbitmqManager } = require("../../shared/utils/rabbitmq");
const { orderEventConsumer } = require("./events/orderEventConsumer");

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/", orderRoutes);

// Health check endpoint with RabbitMQ status
app.get("/health", (req, res) => {
  const rabbitmqHealth = rabbitmqManager.isHealthy();

  res.status(200).json({
    service: "Order Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    rabbitmq: rabbitmqHealth ? "connected" : "disconnected",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Order service error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Database connection and server startup
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Initialize RabbitMQ connection
    if (process.env.ENABLE_RABBITMQ !== "false") {
      try {
        await rabbitmqManager.connect();
        console.log("✅ [Order Service] RabbitMQ connected successfully");

        // Initialize event consumers
        await orderEventConsumer.initialize();
        console.log("✅ [Order Service] Event consumers initialized");
      } catch (error) {
        console.error(
          "❌ [Order Service] RabbitMQ setup failed:",
          error.message
        );
        console.log("⚠️ [Order Service] Continuing without RabbitMQ...");
      }
    }

    const PORT = process.env.PORT || 4003;
    app.listen(PORT, () => {
      console.log(`🚀 Order Service running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `🐰 RabbitMQ: ${
          rabbitmqManager.isHealthy() ? "Connected" : "Disconnected"
        }`
      );
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await rabbitmqManager.close();
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await rabbitmqManager.close();
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});

startServer();
