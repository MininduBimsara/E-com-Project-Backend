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
        // NEW: Add more context for cart clearing
        orderItems: paymentData.orderItems || [],
        orderTotal: paymentData.amount,
      };

      const correlationId = await rabbitmqManager.publishEvent(
        EVENT_TYPES.PAYMENT_SUCCESS,
        eventData,
        {
          source: this.serviceName,
          version: "1.0",
          // Add correlation metadata
          correlationId: paymentData.correlationId,
        }
      );

      console.log(
        `📤 [PaymentEventPublisher] Payment success event published:`,
        {
          orderId: eventData.orderId,
          paymentId: eventData.paymentId,
          userId: eventData.userId,
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
        paymentMethod: paymentData.paymentMethod,
        failedAt: new Date().toISOString(),
        // Important: Include order details for potential cart restoration
        orderItems: paymentData.orderItems || [],
      };

      const correlationId = await rabbitmqManager.publishEvent(
        EVENT_TYPES.PAYMENT_FAILED,
        eventData,
        {
          source: this.serviceName,
          version: "1.0",
          correlationId: paymentData.correlationId,
        }
      );

      console.log(
        `📤 [PaymentEventPublisher] Payment failed event published:`,
        {
          orderId: eventData.orderId,
          userId: eventData.userId,
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

  // NEW: Publish order paid event (alternative approach)
  async publishOrderPaid(orderData, paymentData) {
    try {
      const eventData = {
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        userId: orderData.userId,
        paymentId: paymentData.paymentId,
        transactionId: paymentData.transactionId,
        amount: paymentData.amount,
        currency: paymentData.currency || "USD",
        paymentMethod: paymentData.paymentMethod,
        paidAt: new Date().toISOString(),
        orderItems: orderData.items || [],
      };

      const correlationId = await rabbitmqManager.publishEvent(
        EVENT_TYPES.ORDER_PAID,
        eventData,
        {
          source: this.serviceName,
          version: "1.0",
        }
      );

      console.log(`📤 [PaymentEventPublisher] Order paid event published:`, {
        orderId: eventData.orderId,
        paymentId: eventData.paymentId,
        amount: eventData.amount,
        correlationId,
      });

      return correlationId;
    } catch (error) {
      console.error(
        `❌ [PaymentEventPublisher] Failed to publish order paid event:`,
        error.message
      );
      return null;
    }
  }
}

const paymentEventPublisher = new PaymentEventPublisher();
module.exports = { paymentEventPublisher };
