// backend/services/order-service/events/orderEventPublisher.js

// Smart RabbitMQ import that works in both local and Docker environments
let rabbitmqManager = null;
let EVENT_TYPES = null;

function loadRabbitMQModules() {
  const possiblePaths = [
    "../../../shared/utils/rabbitmq",
    "../shared/utils/rabbitmq", // Docker container path
    "../shared/utils/rabbitmq", // Local development path
  ];

  for (const modulePath of possiblePaths) {
    try {
      const {
        rabbitmqManager: rmqManager,
        EVENT_TYPES: eventTypes,
      } = require(modulePath);
      console.log(
        `✅ Found RabbitMQ module at: ${modulePath} (OrderEventPublisher)`
      );
      return { rabbitmqManager: rmqManager, EVENT_TYPES: eventTypes };
    } catch (err) {
      console.log(`❌ Failed to load from ${modulePath}: ${err.message}`);
      continue;
    }
  }

  console.log(
    "⚠️ RabbitMQ module not found in OrderEventPublisher, continuing without it..."
  );
  return { rabbitmqManager: null, EVENT_TYPES: {} };
}

// Load RabbitMQ modules
const { rabbitmqManager: rmqManager, EVENT_TYPES: eventTypes } =
  loadRabbitMQModules();
rabbitmqManager = rmqManager;
EVENT_TYPES = eventTypes || {};

class OrderEventPublisher {
  constructor() {
    this.serviceName = "order-service";
  }

  async publishOrderCreated(orderData) {
    if (!rabbitmqManager) {
      console.log(
        "⚠️ [OrderEventPublisher] RabbitMQ not available, cannot publish order created event"
      );
      return null;
    }

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

  async publishOrderUpdated(orderData) {
    if (!rabbitmqManager) {
      console.log(
        "⚠️ [OrderEventPublisher] RabbitMQ not available, cannot publish order updated event"
      );
      return null;
    }

    try {
      const eventData = {
        orderId: orderData._id || orderData.id,
        orderNumber: orderData.orderNumber,
        userId: orderData.userId,
        status: orderData.status,
        paymentStatus: orderData.paymentStatus,
        paymentId: orderData.paymentId,
        updatedAt: new Date().toISOString(),
        // Include relevant fields that might have changed
        total: orderData.total,
        paymentMethod: orderData.paymentMethod,
      };

      const correlationId = await rabbitmqManager.publishEvent(
        EVENT_TYPES.ORDER_UPDATED,
        eventData,
        {
          source: this.serviceName,
          version: "1.0",
        }
      );

      console.log(`📤 [OrderEventPublisher] Order updated event published:`, {
        orderId: eventData.orderId,
        orderNumber: eventData.orderNumber,
        status: eventData.status,
        paymentStatus: eventData.paymentStatus,
        correlationId,
      });

      return correlationId;
    } catch (error) {
      console.error(
        `❌ [OrderEventPublisher] Failed to publish order updated event:`,
        error.message
      );
      return null;
    }
  }

  async publishOrderCancelled(orderData, reason) {
    if (!rabbitmqManager) {
      console.log(
        "⚠️ [OrderEventPublisher] RabbitMQ not available, cannot publish order cancelled event"
      );
      return null;
    }

    try {
      const eventData = {
        orderId: orderData._id || orderData.id,
        orderNumber: orderData.orderNumber,
        userId: orderData.userId,
        cancelReason: reason,
        cancelledAt: new Date().toISOString(),
        // Include items for potential inventory restoration
        items: orderData.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          priceAtOrder: item.priceAtOrder,
          productName: item.productName,
        })),
        total: orderData.total,
      };

      const correlationId = await rabbitmqManager.publishEvent(
        EVENT_TYPES.ORDER_CANCELLED,
        eventData,
        {
          source: this.serviceName,
          version: "1.0",
        }
      );

      console.log(`📤 [OrderEventPublisher] Order cancelled event published:`, {
        orderId: eventData.orderId,
        orderNumber: eventData.orderNumber,
        reason: reason,
        correlationId,
      });

      return correlationId;
    } catch (error) {
      console.error(
        `❌ [OrderEventPublisher] Failed to publish order cancelled event:`,
        error.message
      );
      return null;
    }
  }
}

const orderEventPublisher = new OrderEventPublisher();
module.exports = { orderEventPublisher };
