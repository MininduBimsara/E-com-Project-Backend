const {
  rabbitmqManager,
  EVENT_TYPES,
} = require("../../../shared/utils/rabbitmq");
const cartRepository = require("../repositories/cartRepository");

class CartEventConsumer {
  constructor() {
    this.serviceName = "cart-service";
  }

  async initialize() {
    try {
      // FIXED: Listen to both ORDER_CREATED and PAYMENT_SUCCESS events
      const routingKeys = [
        EVENT_TYPES.ORDER_CREATED, // Keep cart for payment processing
        EVENT_TYPES.PAYMENT_SUCCESS, // Clear cart only after payment success
        EVENT_TYPES.PAYMENT_FAILED, // Handle payment failures (optional)
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
        `👂 [CartEventConsumer] Consumer initialized for events: ${routingKeys.join(
          ", "
        )}`
      );
    } catch (error) {
      console.error(
        `❌ [CartEventConsumer] Failed to initialize consumer:`,
        error.message
      );
      throw error;
    }
  }

  async handleMessage(message, routingKey) {
    try {
      console.log(`📥 [CartEventConsumer] Processing event: ${routingKey}`, {
        correlationId: message.metadata?.correlationId,
        source: message.metadata?.source,
      });

      switch (routingKey) {
        case EVENT_TYPES.ORDER_CREATED:
          await this.handleOrderCreated(message.data);
          break;
        case EVENT_TYPES.PAYMENT_SUCCESS:
          await this.handlePaymentSuccess(message.data);
          break;
        case EVENT_TYPES.PAYMENT_FAILED:
          await this.handlePaymentFailed(message.data);
          break;
        default:
          console.warn(
            `⚠️ [CartEventConsumer] Unknown event type: ${routingKey}`
          );
      }
    } catch (error) {
      console.error(
        `❌ [CartEventConsumer] Error processing ${routingKey}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * NEW: Handle order created event (do NOT clear cart yet)
   * Just log for tracking purposes, cart stays intact for payment
   */
  async handleOrderCreated(orderData) {
    try {
      console.log(`📦 [CartEventConsumer] Processing order created event:`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        orderNumber: orderData.orderNumber,
        total: orderData.total,
        itemCount: orderData.items?.length || 0,
      });

      // Find the user's cart for reference
      const cart = await cartRepository.findCartByUserId(orderData.userId);

      if (!cart) {
        console.log(
          `ℹ️ [CartEventConsumer] No cart found for user: ${orderData.userId}`
        );
        return;
      }

      if (cart.items.length === 0) {
        console.log(
          `ℹ️ [CartEventConsumer] Cart already empty for user: ${orderData.userId}`
        );
        return;
      }

      // IMPORTANT: Do NOT clear cart here, just log the activity
      console.log(
        `📦 [CartEventConsumer] Order created - Cart preserved for payment processing:`,
        {
          orderId: orderData.orderId,
          userId: orderData.userId,
          cartItemCount: cart.items.length,
          cartTotal: cart.total,
          orderTotal: orderData.total,
          status: "cart_preserved_for_payment",
        }
      );

      // Optional: Publish cart reserved event for analytics
      try {
        await rabbitmqManager.publishEvent(
          EVENT_TYPES.CART_RESERVED,
          {
            userId: orderData.userId,
            orderId: orderData.orderId,
            cartId: cart._id,
            reservedItemCount: cart.items.length,
            reservedTotal: cart.total,
            reason: "order_created_awaiting_payment",
            reservedAt: new Date().toISOString(),
          },
          {
            source: this.serviceName,
            version: "1.0",
          }
        );
      } catch (error) {
        console.warn(
          `⚠️ [CartEventConsumer] Failed to publish cart reserved event:`,
          error.message
        );
      }
    } catch (error) {
      console.error(
        `❌ [CartEventConsumer] Failed to handle order created event:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * FIXED: Clear cart only after payment success
   */
  async handlePaymentSuccess(paymentData) {
    try {
      console.log(`💳 [CartEventConsumer] Processing payment success event:`, {
        orderId: paymentData.orderId,
        userId: paymentData.userId,
        paymentId: paymentData.paymentId || paymentData.transactionId,
        amount: paymentData.amount,
      });

      // Find and clear the user's cart
      const cart = await cartRepository.findCartByUserId(paymentData.userId);

      if (!cart) {
        console.log(
          `ℹ️ [CartEventConsumer] No cart found for user: ${paymentData.userId}`
        );
        return;
      }

      if (cart.items.length === 0) {
        console.log(
          `ℹ️ [CartEventConsumer] Cart already empty for user: ${paymentData.userId}`
        );
        return;
      }

      // Store item count before clearing
      const itemCount = cart.items.length;
      const cartTotal = cart.total;

      // Clear the cart after successful payment
      cart.clearCart();
      await cartRepository.saveCart(cart);

      console.log(
        `✅ [CartEventConsumer] Cart cleared after successful payment:`,
        {
          orderId: paymentData.orderId,
          paymentId: paymentData.paymentId || paymentData.transactionId,
          userId: paymentData.userId,
          clearedItemCount: itemCount,
          clearedTotal: cartTotal,
          clearedAt: new Date().toISOString(),
        }
      );

      // Publish cart cleared event
      try {
        await rabbitmqManager.publishEvent(
          EVENT_TYPES.CART_CLEARED,
          {
            userId: paymentData.userId,
            orderId: paymentData.orderId,
            paymentId: paymentData.paymentId || paymentData.transactionId,
            reason: "payment_successful",
            clearedItemCount: itemCount,
            clearedTotal: cartTotal,
            clearedAt: new Date().toISOString(),
          },
          {
            source: this.serviceName,
            version: "1.0",
          }
        );

        console.log(
          `📤 [CartEventConsumer] Cart cleared event published successfully`
        );
      } catch (error) {
        console.warn(
          `⚠️ [CartEventConsumer] Failed to publish cart cleared event:`,
          error.message
        );
      }
    } catch (error) {
      console.error(
        `❌ [CartEventConsumer] Failed to handle payment success event:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * NEW: Handle payment failed event (keep cart for retry)
   */
  async handlePaymentFailed(paymentData) {
    try {
      console.log(`💔 [CartEventConsumer] Processing payment failed event:`, {
        orderId: paymentData.orderId,
        userId: paymentData.userId,
        errorReason: paymentData.errorReason,
        amount: paymentData.amount,
      });

      // Find the user's cart
      const cart = await cartRepository.findCartByUserId(paymentData.userId);

      if (!cart) {
        console.log(
          `ℹ️ [CartEventConsumer] No cart found for user: ${paymentData.userId}`
        );
        return;
      }

      // Cart remains intact for user to retry payment
      console.log(
        `📦 [CartEventConsumer] Cart preserved after payment failure:`,
        {
          orderId: paymentData.orderId,
          userId: paymentData.userId,
          cartItemCount: cart.items.length,
          cartTotal: cart.total,
          errorReason: paymentData.errorReason,
          status: "cart_preserved_for_retry",
        }
      );

      // Optional: Publish cart preserved event for analytics
      try {
        await rabbitmqManager.publishEvent(
          EVENT_TYPES.CART_PRESERVED,
          {
            userId: paymentData.userId,
            orderId: paymentData.orderId,
            reason: "payment_failed",
            errorReason: paymentData.errorReason,
            preservedItemCount: cart.items.length,
            preservedTotal: cart.total,
            preservedAt: new Date().toISOString(),
          },
          {
            source: this.serviceName,
            version: "1.0",
          }
        );
      } catch (error) {
        console.warn(
          `⚠️ [CartEventConsumer] Failed to publish cart preserved event:`,
          error.message
        );
      }
    } catch (error) {
      console.error(
        `❌ [CartEventConsumer] Failed to handle payment failed event:`,
        error.message
      );
      throw error;
    }
  }
}

const cartEventConsumer = new CartEventConsumer();
module.exports = { cartEventConsumer };
