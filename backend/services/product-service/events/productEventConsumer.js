// backend/services/product-service/events/productEventConsumer.js
const {
  rabbitmqManager,
  EVENT_TYPES,
} = require("../../../shared/utils/rabbitmq");
const productRepository = require("../Repository/productRepository");

class ProductEventConsumer {
  constructor() {
    this.serviceName = "product-service";
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
        `👂 [ProductEventConsumer] Consumer initialized for events: ${routingKeys.join(
          ", "
        )}`
      );
    } catch (error) {
      console.error(
        `❌ [ProductEventConsumer] Failed to initialize consumer:`,
        error.message
      );
      throw error;
    }
  }

  async handleMessage(message, routingKey) {
    try {
      console.log(`📥 [ProductEventConsumer] Processing event: ${routingKey}`, {
        correlationId: message.metadata?.correlationId,
        source: message.metadata?.source,
      });

      switch (routingKey) {
        case EVENT_TYPES.ORDER_CREATED:
          await this.handleOrderCreated(message.data);
          break;
        default:
          console.warn(
            `⚠️ [ProductEventConsumer] Unknown event type: ${routingKey}`
          );
      }
    } catch (error) {
      console.error(
        `❌ [ProductEventConsumer] Error processing ${routingKey}:`,
        error.message
      );
      throw error;
    }
  }

  async handleOrderCreated(orderData) {
    try {
      console.log(`📦 [ProductEventConsumer] Processing order created event:`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        itemCount: orderData.items?.length || 0,
      });

      const stockUpdates = [];
      const errors = [];

      // Process each item in the order
      for (const item of orderData.items) {
        try {
          console.log(
            `📦 [ProductEventConsumer] Updating stock for product: ${item.productId}`,
            {
              quantity: item.quantity,
              orderId: orderData.orderId,
            }
          );

          // Find the product
          const product = await productRepository.findById(item.productId);

          if (!product) {
            const error = `Product not found: ${item.productId}`;
            console.error(`❌ [ProductEventConsumer] ${error}`);
            errors.push({ productId: item.productId, error });
            continue;
          }

          // Check if there's enough stock
          if (product.stock < item.quantity) {
            const error = `Insufficient stock for product ${item.productId}. Available: ${product.stock}, Required: ${item.quantity}`;
            console.error(`❌ [ProductEventConsumer] ${error}`);
            errors.push({ productId: item.productId, error });
            continue;
          }

          // Update stock (decrease by ordered quantity)
          const updatedProduct = await productRepository.updateStock(
            item.productId,
            -item.quantity // Negative to decrease stock
          );

          if (updatedProduct) {
            stockUpdates.push({
              productId: item.productId,
              previousStock: product.stock,
              newStock: updatedProduct.stock,
              quantityDeducted: item.quantity,
            });

            console.log(
              `✅ [ProductEventConsumer] Stock updated for product ${item.productId}:`,
              {
                previousStock: product.stock,
                newStock: updatedProduct.stock,
                quantityDeducted: item.quantity,
              }
            );
          } else {
            const error = `Failed to update stock for product: ${item.productId}`;
            console.error(`❌ [ProductEventConsumer] ${error}`);
            errors.push({ productId: item.productId, error });
          }
        } catch (error) {
          console.error(
            `❌ [ProductEventConsumer] Error updating stock for product ${item.productId}:`,
            error.message
          );
          errors.push({ productId: item.productId, error: error.message });
        }
      }

      // Log summary
      console.log(
        `📦 [ProductEventConsumer] Stock update summary for order ${orderData.orderId}:`,
        {
          totalItems: orderData.items.length,
          successfulUpdates: stockUpdates.length,
          errors: errors.length,
          stockUpdates,
          errors,
        }
      );

      // Optionally publish stock updated event for analytics
      if (stockUpdates.length > 0) {
        try {
          await rabbitmqManager.publishEvent(
            EVENT_TYPES.STOCK_UPDATED,
            {
              orderId: orderData.orderId,
              userId: orderData.userId,
              stockUpdates,
              updatedAt: new Date().toISOString(),
            },
            {
              source: this.serviceName,
              version: "1.0",
            }
          );
        } catch (error) {
          console.warn(
            `⚠️ [ProductEventConsumer] Failed to publish stock updated event:`,
            error.message
          );
          // Don't throw - stock update succeeded
        }
      }

      // If there were critical errors, log them but don't fail the message
      if (errors.length > 0) {
        console.warn(
          `⚠️ [ProductEventConsumer] Some stock updates failed for order ${orderData.orderId}:`,
          errors
        );
      }
    } catch (error) {
      console.error(
        `❌ [ProductEventConsumer] Failed to handle order created event:`,
        error.message
      );
      throw error;
    }
  }
}

const productEventConsumer = new ProductEventConsumer();
module.exports = { productEventConsumer };
