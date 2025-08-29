// backend/services/payment-service/events/paymentEventConsumer.js
const {
  rabbitmqManager,
  EVENT_TYPES,
} = require("../../../shared/utils/rabbitmq");
const paymentService = require("../services/paymentService");

class PaymentEventConsumer {
  constructor() {
    this.serviceName = "payment-service";
  }

  async initialize() {
    try {
      const routingKeys = [EVENT_TYPES.ORDER_CREATED];

      await rabbitmqManager.setupConsumer(
        this.serviceName,
        routingKeys,
        this.handleMessage.bind(this),
        {
          prefetch: 3, // Process payments one at a time for better control
          queueArguments: {
            "x-max-retries": 2, // Fewer retries for payments to avoid duplicate charges
          },
        }
      );

      console.log(
        `👂 [PaymentEventConsumer] Consumer initialized for events: ${routingKeys.join(
          ", "
        )}`
      );
    } catch (error) {
      console.error(
        `❌ [PaymentEventConsumer] Failed to initialize consumer:`,
        error.message
      );
      throw error;
    }
  }

  async handleMessage(message, routingKey) {
    try {
      console.log(`📥 [PaymentEventConsumer] Processing event: ${routingKey}`, {
        correlationId: message.metadata?.correlationId,
        source: message.metadata?.source,
      });

      switch (routingKey) {
        case EVENT_TYPES.ORDER_CREATED:
          await this.handleOrderCreated(message.data);
          break;
        default:
          console.warn(
            `⚠️ [PaymentEventConsumer] Unknown event type: ${routingKey}`
          );
      }
    } catch (error) {
      console.error(
        `❌ [PaymentEventConsumer] Error processing ${routingKey}:`,
        error.message
      );
      throw error;
    }
  }

  async handleOrderCreated(orderData) {
    try {
      console.log(`💳 [PaymentEventConsumer] Processing order created event:`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        total: orderData.total,
        paymentMethod: orderData.paymentMethod,
      });

      // Check if payment is required
      if (!orderData.paymentMethod || orderData.total <= 0) {
        console.log(
          `ℹ️ [PaymentEventConsumer] No payment required for order: ${orderData.orderId}`
        );
        return;
      }

      // For now, we'll simulate payment processing
      // In a real system, this would integrate with actual payment providers
      await this.processPayment(orderData);
    } catch (error) {
      console.error(
        `❌ [PaymentEventConsumer] Failed to handle order created event:`,
        error.message
      );
      throw error;
    }
  }

  async processPayment(orderData) {
    try {
      console.log(
        `💳 [PaymentEventConsumer] Processing payment for order: ${orderData.orderId}`
      );

      // Simulate payment processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For demo purposes, simulate success/failure based on amount
      // In real implementation, this would call actual payment service
      const shouldSucceed = orderData.total < 10000; // Fail payments over $100.00

      if (shouldSucceed) {
        await this.handlePaymentSuccess(orderData);
      } else {
        await this.handlePaymentFailure(orderData, "Amount exceeds limit");
      }
    } catch (error) {
      console.error(
        `❌ [PaymentEventConsumer] Payment processing failed:`,
        error.message
      );
      await this.handlePaymentFailure(orderData, error.message);
    }
  }

  async handlePaymentSuccess(orderData) {
    try {
      const transactionId = `TXN-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;

      const paymentData = {
        paymentId: transactionId,
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.total,
        currency: orderData.currency || "USD",
        transactionId: transactionId,
        paymentMethod: orderData.paymentMethod,
        status: "completed",
        processedAt: new Date().toISOString(),
      };

      // Publish payment success event
      await rabbitmqManager.publishEvent(
        EVENT_TYPES.PAYMENT_SUCCESS,
        paymentData,
        {
          source: this.serviceName,
          version: "1.0",
        }
      );

      console.log(
        `✅ [PaymentEventConsumer] Payment successful for order: ${orderData.orderId}`,
        {
          transactionId,
          amount: orderData.total,
        }
      );
    } catch (error) {
      console.error(
        `❌ [PaymentEventConsumer] Failed to handle payment success:`,
        error.message
      );
      throw error;
    }
  }

  async handlePaymentFailure(orderData, errorReason) {
    try {
      const paymentData = {
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.total,
        errorReason: errorReason,
        errorCode: "PAYMENT_FAILED",
        failedAt: new Date().toISOString(),
      };

      // Publish payment failed event
      await rabbitmqManager.publishEvent(
        EVENT_TYPES.PAYMENT_FAILED,
        paymentData,
        {
          source: this.serviceName,
          version: "1.0",
        }
      );

      console.log(
        `❌ [PaymentEventConsumer] Payment failed for order: ${orderData.orderId}`,
        {
          reason: errorReason,
          amount: orderData.total,
        }
      );
    } catch (error) {
      console.error(
        `❌ [PaymentEventConsumer] Failed to handle payment failure:`,
        error.message
      );
      throw error;
    }
  }
}

const paymentEventConsumer = new PaymentEventConsumer();
module.exports = { paymentEventConsumer };

// backend/services/payment-service/events/paymentEventPublisher.js
const {
  rabbitmqManager,
  EVENT_TYPES,
} = require("../../../shared/utils/rabbitmq");

class PaymentEventPublisher {
  constructor() {
    this.serviceName = "payment-service";
  }

  async publishPaymentSuccess(paymentData) {
    try {
      const eventData = {
        paymentId: paymentData.paymentId || paymentData.transactionId,
        orderId: paymentData.orderId,
        userId: paymentData.userId,
        amount: paymentData.amount,
        currency: paymentData.currency || "USD",
        transactionId: paymentData.transactionId,
        paymentMethod: paymentData.paymentMethod,
        processedAt: new Date().toISOString(),
      };

      const correlationId = await rabbitmqManager.publishEvent(
        EVENT_TYPES.PAYMENT_SUCCESS,
        eventData,
        {
          source: this.serviceName,
          version: "1.0",
        }
      );

      console.log(
        `📤 [PaymentEventPublisher] Payment success event published:`,
        {
          orderId: eventData.orderId,
          paymentId: eventData.paymentId,
          amount: eventData.amount,
          correlationId,
        }
      );

      return correlationId;
    } catch (error) {
      console.error(
        `❌ [PaymentEventPublisher] Failed to publish payment success event:`,
        error.message
      );
      return null;
    }
  }

  async publishPaymentFailed(paymentData) {
    try {
      const eventData = {
        orderId: paymentData.orderId,
        userId: paymentData.userId,
        amount: paymentData.amount,
        errorReason: paymentData.errorReason,
        errorCode: paymentData.errorCode || "PAYMENT_FAILED",
        failedAt: new Date().toISOString(),
      };

      const correlationId = await rabbitmqManager.publishEvent(
        EVENT_TYPES.PAYMENT_FAILED,
        eventData,
        {
          source: this.serviceName,
          version: "1.0",
        }
      );

      console.log(
        `📤 [PaymentEventPublisher] Payment failed event published:`,
        {
          orderId: eventData.orderId,
          errorReason: eventData.errorReason,
          amount: eventData.amount,
          correlationId,
        }
      );

      return correlationId;
    } catch (error) {
      console.error(
        `❌ [PaymentEventPublisher] Failed to publish payment failed event:`,
        error.message
      );
      return null;
    }
  }
}

const paymentEventPublisher = new PaymentEventPublisher();
module.exports = { paymentEventPublisher };

// backend/services/payment-service/services/paymentService.js (Updated)
const Payment = require("../models/Payment");
const axios = require("axios");
const { paymentEventPublisher } = require("../events/paymentEventPublisher");

// PayPal Configuration
const getPayPalConfig = () => ({
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  PAYPAL_API_BASE:
    process.env.NODE_ENV === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com",
});

// Get PayPal Access Token
const getPayPalAccessToken = async () => {
  const config = getPayPalConfig();
  const auth = Buffer.from(
    `${config.PAYPAL_CLIENT_ID}:${config.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  try {
    const response = await axios({
      method: "post",
      url: `${config.PAYPAL_API_BASE}/v1/oauth2/token`,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: "grant_type=client_credentials",
      timeout: 10000,
    });

    console.log("✅ PayPal access token obtained successfully");
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Failed to get PayPal access token:", error.message);
    throw new Error("Failed to authenticate with PayPal");
  }
};

// Get Order from Order Service
const getOrderFromOrderService = async (orderId, userId, authToken) => {
  const orderServiceUrl =
    process.env.ORDER_SERVICE_URL || "http://localhost:4003";

  const possibleEndpoints = [
    `${orderServiceUrl}/${orderId}/payment-details`,
    `${orderServiceUrl}/api/orders/${orderId}/payment-details`,
    `${orderServiceUrl}/${orderId}`,
    `${orderServiceUrl}/api/orders/${orderId}`,
  ];

  console.log(`🔍 Attempting to fetch order ${orderId} for user ${userId}`);

  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`🔗 Trying endpoint: ${endpoint}`);

      const headers = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
        headers["Cookie"] = `token=${authToken}`;
      }

      if (userId) {
        headers["X-User-ID"] = userId;
      }

      const response = await axios({
        method: "get",
        url: endpoint,
        headers: headers,
        timeout: 10000,
      });

      console.log(`✅ Order fetched successfully from: ${endpoint}`, {
        orderId: orderId,
        status: response.status,
        orderTotal: response.data.data?.total || response.data?.total,
        currency: response.data.data?.currency || response.data?.currency,
      });

      return response.data.data || response.data;
    } catch (error) {
      console.log(
        `❌ Failed endpoint ${endpoint}: ${
          error.response?.status || error.message
        }`
      );

      if (endpoint === possibleEndpoints[possibleEndpoints.length - 1]) {
        console.error(`❌ All endpoints failed for order ${orderId}:`, {
          lastEndpoint: endpoint,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });

        if (error.response?.status === 404) {
          throw new Error("Order not found");
        } else if (error.response?.status === 403) {
          throw new Error("Not authorized to access this order");
        } else {
          throw new Error(`Failed to fetch order: ${error.message}`);
        }
      }
    }
  }
};

// Update Order Status via Events
const updateOrderStatusViaEvent = async (orderId, paymentData, userId) => {
  try {
    console.log(
      `💳 Updating order payment status via event for: ${orderId}`,
      paymentData
    );

    if (paymentData.status === "completed") {
      await paymentEventPublisher.publishPaymentSuccess({
        orderId,
        userId,
        ...paymentData,
      });
    } else {
      await paymentEventPublisher.publishPaymentFailed({
        orderId,
        userId,
        errorReason: paymentData.errorReason || "Payment processing failed",
        ...paymentData,
      });
    }

    console.log(`✅ Payment status event published for order: ${orderId}`);
  } catch (error) {
    console.error(
      `❌ Failed to publish payment status event for order ${orderId}:`,
      error.message
    );
    // Don't throw - payment was processed, event failure shouldn't fail the payment
  }
};

// Create PayPal Order
const createPayPalOrder = async (
  orderId,
  amount,
  userId,
  returnUrl,
  cancelUrl,
  authToken
) => {
  console.log(
    `🚀 Creating PayPal order for: ${orderId}, amount: ${amount}, user: ${userId}`
  );

  const order = await getOrderFromOrderService(orderId, userId, authToken);

  if (!order) {
    throw new Error("Order not found");
  }

  const orderUserId = order.userId || order.user_id || order.customer_id;
  if (orderUserId && orderUserId !== userId) {
    throw new Error("Not authorized to access this order");
  }

  const paymentAmount = amount || order.total;

  console.log(`💰 Payment details:`, {
    orderId: orderId,
    orderTotal: order.total,
    requestedAmount: amount,
    finalAmount: paymentAmount,
    currency: order.currency || "USD",
  });

  const accessToken = await getPayPalAccessToken();
  const config = getPayPalConfig();

  const paypalOrderData = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: orderId,
        description: `EcoStore Order #${order.orderNumber || orderId}`,
        amount: {
          currency_code: order.currency || "USD",
          value: paymentAmount.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: "EcoStore",
      landing_page: "BILLING",
      user_action: "PAY_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };

  console.log(`📤 Sending PayPal order creation request:`, paypalOrderData);

  try {
    const response = await axios({
      method: "post",
      url: `${config.PAYPAL_API_BASE}/v2/checkout/orders`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: paypalOrderData,
      timeout: 15000,
    });

    console.log(`✅ PayPal order created successfully:`, {
      paypalOrderId: response.data.id,
      status: response.data.status,
      links: response.data.links?.map((link) => ({
        rel: link.rel,
        href: link.href,
      })),
    });

    return {
      orderId: order._id || order.id || orderId,
      paypalOrderId: response.data.id,
      links: response.data.links,
    };
  } catch (error) {
    console.error(`❌ PayPal order creation failed:`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw new Error(
      `PayPal order creation failed: ${
        error.response?.data?.message || error.message
      }`
    );
  }
};

// Capture PayPal Payment
const capturePayPalPayment = async (
  orderId,
  paypalOrderId,
  userId,
  authToken
) => {
  console.log(
    `💳 Capturing PayPal payment: order=${orderId}, paypal=${paypalOrderId}, user=${userId}`
  );

  const order = await getOrderFromOrderService(orderId, userId, authToken);

  if (!order) {
    throw new Error("Order not found");
  }

  const orderUserId = order.userId || order.user_id || order.customer_id;
  if (orderUserId && orderUserId !== userId) {
    throw new Error("Not authorized to access this order");
  }

  const config = getPayPalConfig();
  const accessToken = await getPayPalAccessToken();

  console.log(`📤 Capturing PayPal payment: ${paypalOrderId}`);

  try {
    const response = await axios({
      method: "post",
      url: `${config.PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });

    console.log(`📨 PayPal capture response:`, {
      status: response.data.status,
      paypalOrderId: paypalOrderId,
      captures:
        response.data.purchase_units?.[0]?.payments?.captures?.length || 0,
    });

    if (response.data.status !== "COMPLETED") {
      throw new Error(
        `Payment was not completed successfully. Status: ${response.data.status}`
      );
    }

    const transactionId = `TXN-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    console.log(
      `💾 Creating payment record with transaction ID: ${transactionId}`
    );

    // Create payment record
    const payment = await Payment.create({
      user_id: userId,
      order_id: orderId,
      amount: order.total,
      currency: order.currency || "USD",
      payment_method: "paypal",
      payment_status: "completed",
      transaction_id: transactionId,
      payment_details: {
        paypal_order_id: paypalOrderId,
        paypal_payer_id: response.data.payer?.payer_id || "unknown",
        provider: "PayPal",
      },
    });

    console.log(`✅ Payment record created:`, {
      paymentId: payment._id,
      transactionId: transactionId,
      amount: payment.amount,
      status: payment.payment_status,
    });

    // Update order status via events instead of direct REST call
    await updateOrderStatusViaEvent(
      orderId,
      {
        status: "completed",
        paymentId: transactionId,
        paymentMethod: "paypal",
        amount: order.total,
        transactionId: transactionId,
      },
      userId
    );

    console.log(
      `🎉 Payment capture completed successfully for order: ${orderId}`
    );

    return { payment, order };
  } catch (error) {
    console.error(`❌ PayPal payment capture failed:`, {
      paypalOrderId: paypalOrderId,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Publish payment failed event
    await updateOrderStatusViaEvent(
      orderId,
      {
        status: "failed",
        errorReason:
          error.response?.data?.details?.[0]?.description || error.message,
        amount: order.total,
      },
      userId
    );

    throw new Error(
      `Payment capture failed: ${
        error.response?.data?.details?.[0]?.description || error.message
      }`
    );
  }
};

// Get Payment History
const getPaymentHistory = async (userId) => {
  console.log(`📜 Fetching payment history for user: ${userId}`);

  try {
    const payments = await Payment.find({ user_id: userId }).sort({
      createdAt: -1,
    });

    console.log(`✅ Found ${payments.length} payments for user: ${userId}`);
    return payments;
  } catch (error) {
    console.error(
      `❌ Failed to fetch payment history for user ${userId}:`,
      error.message
    );
    throw new Error("Failed to fetch payment history");
  }
};

// Get Payment by Transaction ID
const getPaymentByTransactionId = async (transactionId, userId) => {
  console.log(
    `🔍 Fetching payment by transaction ID: ${transactionId} for user: ${userId}`
  );

  try {
    const payment = await Payment.findOne({ transaction_id: transactionId });

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.user_id !== userId) {
      throw new Error("Not authorized to access this payment");
    }

    console.log(`✅ Payment found:`, {
      transactionId: transactionId,
      amount: payment.amount,
      status: payment.payment_status,
    });

    return payment;
  } catch (error) {
    console.error(
      `❌ Failed to fetch payment ${transactionId}:`,
      error.message
    );
    throw error;
  }
};

module.exports = {
  createPayPalOrder,
  capturePayPalPayment,
  getPaymentHistory,
  getPaymentByTransactionId,
};

// backend/services/payment-service/server.js (Updated)
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

dotenv.config();

const paymentRoutes = require("./routes/paymentRoutes");
const { rabbitmqManager } = require("../../shared/utils/rabbitmq");
const { paymentEventConsumer } = require("./events/paymentEventConsumer");

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
app.use("/", paymentRoutes);

const PORT = process.env.PORT || 4004;

// Health check endpoint with RabbitMQ status
app.get("/health", (req, res) => {
  const rabbitmqHealth = rabbitmqManager.isHealthy();

  res.status(200).json({
    service: "Payment Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    rabbitmq: rabbitmqHealth ? "connected" : "disconnected",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Payment service error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Database connection and server startup
const startServer = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/payment-service"
    );
    console.log("Connected to MongoDB");

    // Initialize RabbitMQ connection
    if (process.env.ENABLE_RABBITMQ !== "false") {
      try {
        await rabbitmqManager.connect();
        console.log("✅ [Payment Service] RabbitMQ connected successfully");

        // Initialize event consumers
        await paymentEventConsumer.initialize();
        console.log("✅ [Payment Service] Event consumers initialized");
      } catch (error) {
        console.error(
          "❌ [Payment Service] RabbitMQ setup failed:",
          error.message
        );
        console.log("⚠️ [Payment Service] Continuing without RabbitMQ...");
      }
    }

    app.listen(PORT, () => {
      console.log(`🚀 Payment Service running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `🐰 RabbitMQ: ${
          rabbitmqManager.isHealthy() ? "Connected" : "Disconnected"
        }`
      );
    });
  } catch (error) {
    console.error("Database connection error:", error);
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
