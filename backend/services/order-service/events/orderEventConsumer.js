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
