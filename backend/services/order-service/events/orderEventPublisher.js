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


