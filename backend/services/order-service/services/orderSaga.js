const axios = require("axios");

/**
 * Saga Pattern Implementation for Order Creation
 * Handles distributed transactions across multiple services
 */
class OrderSaga {
  constructor() {
    this.cartServiceUrl =
      process.env.CART_SERVICE_URL || "http://localhost:4002";
    this.productServiceUrl =
      process.env.PRODUCT_SERVICE_URL || "http://localhost:4001";
    this.paymentServiceUrl =
      process.env.PAYMENT_SERVICE_URL || "http://localhost:4004";
  }

  /**
   * Create order with saga pattern
   */
  async createOrder(userId, orderData, token) {
    const sagaId = `saga_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const sagaLog = [];

    try {
      console.log(`🚀 Starting order creation saga: ${sagaId}`);

      // Step 1: Validate cart
      const cartValidation = await this.validateCart(userId, token);
      if (!cartValidation.valid) {
        throw new Error(`Cart validation failed: ${cartValidation.message}`);
      }
      sagaLog.push({
        step: "cart_validation",
        status: "success",
        data: cartValidation,
      });

      // Step 2: Reserve products (decrease stock)
      const stockReservation = await this.reserveProducts(userId, token);
      sagaLog.push({
        step: "stock_reservation",
        status: "success",
        data: stockReservation,
      });

      // Step 3: Create order
      const order = await this.createOrderRecord(
        userId,
        orderData,
        cartValidation.cart
      );
      sagaLog.push({
        step: "order_creation",
        status: "success",
        data: { orderId: order.id },
      });

      // Step 4: Process payment
      const payment = await this.processPayment(
        order.id,
        order.total,
        orderData.paymentMethod,
        token
      );
      sagaLog.push({
        step: "payment_processing",
        status: "success",
        data: { paymentId: payment.id },
      });

      // Step 5: Clear cart
      await this.clearCart(userId, token);
      sagaLog.push({ step: "cart_clear", status: "success" });

      console.log(`✅ Order creation saga completed successfully: ${sagaId}`);
      return {
        success: true,
        order,
        payment,
        sagaId,
      };
    } catch (error) {
      console.error(`❌ Order creation saga failed: ${sagaId}`, error.message);

      // Compensating transactions (rollback)
      await this.compensateSaga(sagaLog, userId, token);

      throw error;
    }
  }

  /**
   * Validate cart before order creation
   */
  async validateCart(userId, token) {
    try {
      const response = await axios.get(
        `${this.cartServiceUrl}/api/cart/${userId}/validate`,
        {
          headers: { Cookie: `token=${token}` },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(
        `Cart validation failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Reserve products (decrease stock)
   */
  async reserveProducts(userId, token) {
    try {
      const response = await axios.post(
        `${this.cartServiceUrl}/api/cart/${userId}/reserve`,
        {},
        {
          headers: { Cookie: `token=${token}` },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(
        `Product reservation failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Create order record
   */
  async createOrderRecord(userId, orderData, cartData) {
    try {
      const orderPayload = {
        userId,
        items: cartData.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          priceAtOrder: item.priceAtAdd,
          productName: item.product?.name || "Unknown Product",
          productImageUrl: item.product?.imageUrl || null,
        })),
        subtotal: cartData.subtotal,
        shipping: cartData.shipping,
        total: cartData.total,
        shippingAddress: orderData.shippingAddress,
        paymentMethod: orderData.paymentMethod,
      };

      const response = await axios.post(
        `${this.cartServiceUrl}/api/orders`,
        orderPayload,
        {
          headers: { Cookie: `token=${token}` },
          timeout: 10000,
        }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(
        `Order creation failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Process payment
   */
  async processPayment(orderId, amount, paymentMethod, token) {
    try {
      const response = await axios.post(
        `${this.paymentServiceUrl}/api/payments`,
        {
          orderId,
          amount,
          paymentMethod,
        },
        {
          headers: { Cookie: `token=${token}` },
          timeout: 30000, // Longer timeout for payment processing
        }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(
        `Payment processing failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Clear cart after successful order
   */
  async clearCart(userId, token) {
    try {
      await axios.delete(`${this.cartServiceUrl}/api/cart/${userId}`, {
        headers: { Cookie: `token=${token}` },
        timeout: 10000,
      });
    } catch (error) {
      console.warn(`Cart clear failed (non-critical): ${error.message}`);
    }
  }

  /**
   * Compensating transactions (rollback)
   */
  async compensateSaga(sagaLog, userId, token) {
    console.log("🔄 Starting compensating transactions...");

    // Reverse the saga steps in reverse order
    for (let i = sagaLog.length - 1; i >= 0; i--) {
      const step = sagaLog[i];

      try {
        switch (step.step) {
          case "cart_clear":
            // No compensation needed for cart clear
            break;

          case "payment_processing":
            if (step.data?.paymentId) {
              await this.cancelPayment(step.data.paymentId, token);
            }
            break;

          case "order_creation":
            if (step.data?.orderId) {
              await this.cancelOrder(step.data.orderId, token);
            }
            break;

          case "stock_reservation":
            await this.releaseProducts(userId, token);
            break;

          case "cart_validation":
            // No compensation needed for validation
            break;
        }

        console.log(`✅ Compensated step: ${step.step}`);
      } catch (error) {
        console.error(
          `❌ Failed to compensate step ${step.step}:`,
          error.message
        );
      }
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(paymentId, token) {
    try {
      await axios.put(
        `${this.paymentServiceUrl}/api/payments/${paymentId}/cancel`,
        {},
        {
          headers: { Cookie: `token=${token}` },
          timeout: 10000,
        }
      );
    } catch (error) {
      console.error(`Failed to cancel payment ${paymentId}:`, error.message);
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, token) {
    try {
      await axios.put(
        `${this.cartServiceUrl}/api/orders/${orderId}/cancel`,
        {},
        {
          headers: { Cookie: `token=${token}` },
          timeout: 10000,
        }
      );
    } catch (error) {
      console.error(`Failed to cancel order ${orderId}:`, error.message);
    }
  }

  /**
   * Release products (increase stock back)
   */
  async releaseProducts(userId, token) {
    try {
      await axios.post(
        `${this.cartServiceUrl}/api/cart/${userId}/release`,
        {},
        {
          headers: { Cookie: `token=${token}` },
          timeout: 10000,
        }
      );
    } catch (error) {
      console.error(`Failed to release products:`, error.message);
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, token) {
    try {
      const response = await axios.put(
        `${this.cartServiceUrl}/api/orders/${orderId}/status`,
        { status },
        {
          headers: { Cookie: `token=${token}` },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(
        `Order status update failed: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Get order with saga information
   */
  async getOrder(orderId, token) {
    try {
      const response = await axios.get(
        `${this.cartServiceUrl}/api/orders/${orderId}`,
        {
          headers: { Cookie: `token=${token}` },
          timeout: 10000,
        }
      );

      return response.data.data;
    } catch (error) {
      throw new Error(
        `Failed to get order: ${error.response?.data?.message || error.message}`
      );
    }
  }
}

module.exports = new OrderSaga();
