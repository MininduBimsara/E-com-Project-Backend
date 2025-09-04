// services/paymentService.js - Fixed to work with existing Order service
const Payment = require("../models/Payment");
const axios = require("axios");
const { paymentEventPublisher } = require("../events/paymentEventPublisher");

// PayPal Configuration
const getPayPalConfig = () => ({
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  PAYPAL_API_BASE:
    process.env.NODE_ENV === "production"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com",
});

// Get PayPal Access Token
const getPayPalAccessToken = async () => {
  const config = getPayPalConfig();
  const auth = Buffer.from(
    `${config.PAYPAL_CLIENT_ID}:${config.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  try {
    const response = await axios({
      method: "post",
      url: `${config.PAYPAL_API_BASE}/v1/oauth2/token`,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: "grant_type=client_credentials",
      timeout: 10000,
    });

    console.log("✅ PayPal access token obtained successfully");
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Failed to get PayPal access token:", error.message);
    throw new Error("Failed to authenticate with PayPal");
  }
};

// Get Order from Order Service - Using existing endpoints
const getOrderFromOrderService = async (orderId, userId, authToken) => {
  // First try the payment-details endpoint if it exists
  const orderServiceUrl =
    process.env.ORDER_SERVICE_URL || "http://localhost:4003";

  // Try different possible endpoints based on your existing Order service
  const possibleEndpoints = [
    `${orderServiceUrl}/${orderId}/payment-details`,
    `${orderServiceUrl}/api/orders/${orderId}/payment-details`,
    `${orderServiceUrl}/${orderId}`,
    `${orderServiceUrl}/api/orders/${orderId}`,
  ];

  console.log(`🔍 Attempting to fetch order ${orderId} for user ${userId}`);

  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`🔗 Trying endpoint: ${endpoint}`);

      const headers = {
        "Content-Type": "application/json",
      };

      // Add authentication headers
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
        headers["Cookie"] = `token=${authToken}`;
      }

      // Add user ID header for service-to-service calls
      if (userId) {
        headers["X-User-ID"] = userId;
      }

      const response = await axios({
        method: "get",
        url: endpoint,
        headers: headers,
        timeout: 10000,
      });

      console.log(`✅ Order fetched successfully from: ${endpoint}`, {
        orderId: orderId,
        status: response.status,
        orderTotal: response.data.data?.total || response.data?.total,
        currency: response.data.data?.currency || response.data?.currency,
      });

      // Return the order data, handling different response structures
      return response.data.data || response.data;
    } catch (error) {
      console.log(
        `❌ Failed endpoint ${endpoint}: ${
          error.response?.status || error.message
        }`
      );

      // If this is the last endpoint and we still failed, throw the error
      if (endpoint === possibleEndpoints[possibleEndpoints.length - 1]) {
        console.error(`❌ All endpoints failed for order ${orderId}:`, {
          lastEndpoint: endpoint,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });

        if (error.response?.status === 404) {
          throw new Error("Order not found");
        } else if (error.response?.status === 403) {
          throw new Error("Not authorized to access this order");
        } else {
          throw new Error(`Failed to fetch order: ${error.message}`);
        }
      }
    }
  }
};

// Update Order Status - Using existing endpoints
const updateOrderStatus = async (orderId, paymentData, userId, authToken) => {
  const orderServiceUrl =
    process.env.ORDER_SERVICE_URL || "http://localhost:4003";

  // Try different possible endpoints for updating payment status
  const possibleEndpoints = [
    `${orderServiceUrl}/${orderId}/payment-confirmation`,
    `${orderServiceUrl}/api/orders/${orderId}/payment-confirmation`,
    `${orderServiceUrl}/${orderId}`, // PATCH/PUT to update order
    `${orderServiceUrl}/api/orders/${orderId}`, // PATCH/PUT to update order
  ];

  console.log(`💳 Updating order payment status for: ${orderId}`, paymentData);

  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`🔗 Trying update endpoint: ${endpoint}`);

      const headers = {
        "Content-Type": "application/json",
      };

      // Add authentication headers
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
        headers["Cookie"] = `token=${authToken}`;
      }

      // Add user ID header for service-to-service calls
      if (userId) {
        headers["X-User-ID"] = userId;
      }

      const response = await axios({
        method: "put",
        url: endpoint,
        headers: headers,
        data: paymentData,
        timeout: 10000,
      });

      console.log(
        `✅ Order payment status updated successfully via: ${endpoint}`
      );
      return response.data;
    } catch (error) {
      console.log(
        `❌ Failed update endpoint ${endpoint}: ${
          error.response?.status || error.message
        }`
      );

      // If this is the last endpoint, log the error but don't throw
      // Payment was successful, order update failure shouldn't fail the payment
      if (endpoint === possibleEndpoints[possibleEndpoints.length - 1]) {
        console.error(`❌ All update endpoints failed for order ${orderId}:`, {
          lastEndpoint: endpoint,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        console.warn(
          "⚠️ Payment was successful but order status update failed - this is non-critical"
        );
      }
    }
  }
};

// Create PayPal Order
const createPayPalOrder = async (
  orderId,
  amount,
  userId,
  returnUrl,
  cancelUrl,
  authToken
) => {
  console.log(
    `🚀 Creating PayPal order for: ${orderId}, amount: ${amount}, user: ${userId}`
  );

  // Get order details from your existing Order service
  const order = await getOrderFromOrderService(orderId, userId, authToken);

  if (!order) {
    throw new Error("Order not found");
  }

  // Check authorization - handle different order object structures
  const orderUserId = order.userId || order.user_id || order.customer_id;
  if (orderUserId && orderUserId !== userId) {
    throw new Error("Not authorized to access this order");
  }

  const paymentAmount = amount || order.total;

  console.log(`💰 Payment details:`, {
    orderId: orderId,
    orderTotal: order.total,
    requestedAmount: amount,
    finalAmount: paymentAmount,
    currency: order.currency || "USD",
  });

  const accessToken = await getPayPalAccessToken();
  const config = getPayPalConfig();

  const paypalOrderData = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: orderId,
        description: `EcoStore Order #${order.orderNumber || orderId}`,
        amount: {
          currency_code: order.currency || "USD",
          value: paymentAmount.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: "EcoStore",
      landing_page: "BILLING",
      user_action: "PAY_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };

  console.log(`📤 Sending PayPal order creation request:`, paypalOrderData);

  try {
    const response = await axios({
      method: "post",
      url: `${config.PAYPAL_API_BASE}/v2/checkout/orders`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data: paypalOrderData,
      timeout: 15000,
    });

    console.log(`✅ PayPal order created successfully:`, {
      paypalOrderId: response.data.id,
      status: response.data.status,
      links: response.data.links?.map((link) => ({
        rel: link.rel,
        href: link.href,
      })),
    });

    return {
      orderId: order._id || order.id || orderId,
      paypalOrderId: response.data.id,
      links: response.data.links,
    };
  } catch (error) {
    console.error(`❌ PayPal order creation failed:`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw new Error(
      `PayPal order creation failed: ${
        error.response?.data?.message || error.message
      }`
    );
  }
};

// Capture PayPal Payment
const capturePayPalPayment = async (
  orderId,
  paypalOrderId,
  userId,
  authToken
) => {
  console.log(
    `💳 Capturing PayPal payment: order=${orderId}, paypal=${paypalOrderId}, user=${userId}`
  );

  // Get order details
  const order = await getOrderFromOrderService(orderId, userId, authToken);
  if (!order) {
    throw new Error("Order not found");
  }

  const orderUserId = order.userId || order.user_id || order.customer_id;
  if (orderUserId && orderUserId !== userId) {
    throw new Error("Not authorized to access this order");
  }

  const config = getPayPalConfig();
  const accessToken = await getPayPalAccessToken();

  console.log(`📤 Capturing PayPal payment: ${paypalOrderId}`);

  try {
    // Capture payment with PayPal
    const response = await axios({
      method: "post",
      url: `${config.PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });

    console.log(`📨 PayPal capture response:`, {
      status: response.data.status,
      paypalOrderId: paypalOrderId,
      captures:
        response.data.purchase_units?.[0]?.payments?.captures?.length || 0,
    });

    if (response.data.status !== "COMPLETED") {
      throw new Error(
        `Payment was not completed successfully. Status: ${response.data.status}`
      );
    }

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    console.log(
      `💾 Creating payment record with transaction ID: ${transactionId}`
    );

    // Create payment record
    const payment = await Payment.create({
      user_id: userId,
      order_id: orderId,
      amount: order.total,
      currency: order.currency || "USD",
      payment_method: "paypal",
      payment_status: "completed",
      transaction_id: transactionId,
      payment_details: {
        paypal_order_id: paypalOrderId,
        paypal_payer_id: response.data.payer?.payer_id || "unknown",
        provider: "PayPal",
        captured_at: new Date().toISOString(),
      },
    });

    console.log(`✅ Payment record created:`, {
      paymentId: payment._id,
      transactionId: transactionId,
      amount: payment.amount,
      status: payment.payment_status,
    });

    // CHANGED: Publish PAYMENT_SUCCESS event instead of updating order directly
    // This will trigger:
    // 1. Order Service to update order status
    // 2. Cart Service to clear the cart
    const paymentSuccessData = {
      paymentId: transactionId,
      orderId: orderId,
      userId: userId,
      amount: order.total,
      currency: order.currency || "USD",
      transactionId: transactionId,
      paymentMethod: "paypal",
      orderItems: order.items || [],
      orderNumber: order.orderNumber,
      processedAt: new Date().toISOString(),
    };

    // Publish payment success event
    const correlationId = await paymentEventPublisher.publishPaymentSuccess(
      paymentSuccessData
    );

    console.log(
      `🎉 Payment capture completed successfully for order: ${orderId}`,
      {
        transactionId,
        correlationId,
        eventPublished: "PAYMENT_SUCCESS",
      }
    );

    return {
      payment: {
        ...payment.toObject(),
        transaction_id: transactionId,
        amount: payment.amount,
        currency: payment.currency,
        payment_method: payment.payment_method,
        payment_status: payment.payment_status,
      },
      order: {
        ...order,
        paymentConfirmed: true,
        paymentId: transactionId,
      },
    };
  } catch (error) {
    console.error(`❌ PayPal payment capture failed:`, {
      paypalOrderId: paypalOrderId,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // CHANGED: Publish payment failure event
    const paymentFailureData = {
      orderId: orderId,
      userId: userId,
      amount: order.total,
      paymentMethod: "paypal",
      errorReason:
        error.response?.data?.details?.[0]?.description || error.message,
      errorCode: "PAYPAL_CAPTURE_FAILED",
      orderItems: order.items || [],
      failedAt: new Date().toISOString(),
    };

    await paymentEventPublisher.publishPaymentFailed(paymentFailureData);

    throw new Error(
      `Payment capture failed: ${
        error.response?.data?.details?.[0]?.description || error.message
      }`
    );
  }
};


// Get Payment History
const getPaymentHistory = async (userId) => {
  console.log(`📜 Fetching payment history for user: ${userId}`);

  try {
    const payments = await Payment.find({ user_id: userId }).sort({
      createdAt: -1,
    });

    console.log(`✅ Found ${payments.length} payments for user: ${userId}`);
    return payments;
  } catch (error) {
    console.error(
      `❌ Failed to fetch payment history for user ${userId}:`,
      error.message
    );
    throw new Error("Failed to fetch payment history");
  }
};

// Get Payment by Transaction ID
const getPaymentByTransactionId = async (transactionId, userId) => {
  console.log(
    `🔍 Fetching payment by transaction ID: ${transactionId} for user: ${userId}`
  );

  try {
    const payment = await Payment.findOne({ transaction_id: transactionId });

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.user_id !== userId) {
      throw new Error("Not authorized to access this payment");
    }

    console.log(`✅ Payment found:`, {
      transactionId: transactionId,
      amount: payment.amount,
      status: payment.payment_status,
    });

    return payment;
  } catch (error) {
    console.error(
      `❌ Failed to fetch payment ${transactionId}:`,
      error.message
    );
    throw error;
  }
};

module.exports = {
  createPayPalOrder,
  capturePayPalPayment,
  getPaymentHistory,
  getPaymentByTransactionId,
};
