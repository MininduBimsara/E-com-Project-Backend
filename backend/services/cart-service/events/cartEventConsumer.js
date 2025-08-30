// backend/services/cart-service/events/cartEventConsumer.js
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
      const routingKeys = [EVENT_TYPES.ORDER_CREATED];

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

  async handleOrderCreated(orderData) {
    try {
      console.log(`🛒 [CartEventConsumer] Processing order created event:`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        itemCount: orderData.items?.length || 0,
      });

      // Find and clear the user's cart
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

      // Clear the cart
      cart.clearCart();
      await cartRepository.saveCart(cart);

      console.log(
        `✅ [CartEventConsumer] Cart cleared successfully for user: ${orderData.userId}`,
        {
          orderId: orderData.orderId,
          previousItemCount: cart.items.length,
        }
      );

      // Optionally publish cart cleared event for analytics
      try {
        await rabbitmqManager.publishEvent(
          EVENT_TYPES.CART_CLEARED,
          {
            userId: orderData.userId,
            orderId: orderData.orderId,
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
        // Don't throw - cart clearing succeeded
      }
    } catch (error) {
      console.error(
        `❌ [CartEventConsumer] Failed to handle order created event:`,
        error.message
      );
      throw error;
    }
  }
}

const cartEventConsumer = new CartEventConsumer();
module.exports = { cartEventConsumer };
