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
      // CRITICAL FIX: Listen to PAYMENT_SUCCESS instead of ORDER_CREATED
      const routingKeys = [
        EVENT_TYPES.PAYMENT_SUCCESS, // ✅ Wait for payment success
        // EVENT_TYPES.ORDER_CREATED,  // ❌ Remove this - don't clear on order creation
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
        case EVENT_TYPES.PAYMENT_SUCCESS:
          await this.handlePaymentSuccess(message.data);
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

  // RENAMED: Clear cart only after payment success
  async handlePaymentSuccess(paymentData) {
    try {
      console.log(`💳 [CartEventConsumer] Processing payment success event:`, {
        orderId: paymentData.orderId,
        userId: paymentData.userId,
        paymentId: paymentData.paymentId,
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

      // Clear the cart after successful payment
      cart.clearCart();
      await cartRepository.saveCart(cart);

      console.log(
        `✅ [CartEventConsumer] Cart cleared after successful payment for user: ${paymentData.userId}`,
        {
          orderId: paymentData.orderId,
          paymentId: paymentData.paymentId,
          clearedItemCount: itemCount,
        }
      );

      // Publish cart cleared event
      try {
        await rabbitmqManager.publishEvent(
          EVENT_TYPES.CART_CLEARED,
          {
            userId: paymentData.userId,
            orderId: paymentData.orderId,
            paymentId: paymentData.paymentId,
            reason: "payment_successful",
            clearedItemCount: itemCount,
            clearedAt: new Date().toISOString(),
          },
          {
            source: this.serviceName,
            version: "1.0",
          }
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

  // REMOVE the handleOrderCreated method entirely
  // async handleOrderCreated(orderData) { ... } ← DELETE THIS METHOD
}

const cartEventConsumer = new CartEventConsumer();
module.exports = { cartEventConsumer };
