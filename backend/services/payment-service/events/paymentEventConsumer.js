// backend/services/payment-service/events/paymentEventConsumer.js

// Smart RabbitMQ import that works in both local and Docker environments
let rabbitmqManager = null;
let EVENT_TYPES = null;

function loadRabbitMQModules() {
  const possiblePaths = [
    "../shared/utils/rabbitmq", // Docker container path
    "../../../shared/utils/rabbitmq", // Local development path
  ];

  for (const modulePath of possiblePaths) {
    try {
      const {
        rabbitmqManager: rmqManager,
        EVENT_TYPES: eventTypes,
      } = require(modulePath);
      console.log(
        `✅ Found RabbitMQ module at: ${modulePath} (PaymentEventConsumer)`
      );
      return { rabbitmqManager: rmqManager, EVENT_TYPES: eventTypes };
    } catch (err) {
      console.log(`❌ Failed to load from ${modulePath}: ${err.message}`);
      continue;
    }
  }

  console.log(
    "⚠️ RabbitMQ module not found in PaymentEventConsumer, continuing without it..."
  );
  return { rabbitmqManager: null, EVENT_TYPES: {} };
}

// Load RabbitMQ modules
const { rabbitmqManager: rmqManager, EVENT_TYPES: eventTypes } =
  loadRabbitMQModules();
rabbitmqManager = rmqManager;
EVENT_TYPES = eventTypes || {};

const paymentService = require("../services/paymentService");

class PaymentEventConsumer {
  constructor() {
    this.serviceName = "payment-service";
  }

  async initialize() {
    if (!rabbitmqManager) {
      console.log(
        "⚠️ [PaymentEventConsumer] RabbitMQ not available, skipping initialization"
      );
      return;
    }

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
    if (!rabbitmqManager) {
      console.log(
        "⚠️ [PaymentEventConsumer] RabbitMQ not available, cannot handle message"
      );
      return;
    }

    try {
      console.log(`🔥 [PaymentEventConsumer] Processing event: ${routingKey}`, {
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
    if (!rabbitmqManager) {
      console.log(
        "⚠️ [PaymentEventConsumer] RabbitMQ not available, cannot publish payment success"
      );
      return;
    }

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
    if (!rabbitmqManager) {
      console.log(
        "⚠️ [PaymentEventConsumer] RabbitMQ not available, cannot publish payment failure"
      );
      return;
    }

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
