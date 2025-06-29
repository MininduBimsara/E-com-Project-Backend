// services/paymentService.js
const Payment = require("../models/Payment");
const axios = require("axios");

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

  const response = await axios({
    method: "post",
    url: `${config.PAYPAL_API_BASE}/v1/oauth2/token`,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: "grant_type=client_credentials",
  });

  return response.data.access_token;
};

// Get Order from Order Service
const getOrderFromOrderService = async (orderId, userId) => {
  const orderServiceUrl =
    process.env.ORDER_SERVICE_URL || "http://localhost:4003";

  const response = await axios({
    method: "get",
    url: `${orderServiceUrl}/api/orders/${orderId}`,
    headers: {
      "X-User-ID": userId,
    },
  });

  return response.data;
};

// Update Order Status
const updateOrderStatus = async (orderId, paymentData, userId) => {
  try {
    const orderServiceUrl =
      process.env.ORDER_SERVICE_URL || "http://localhost:4003";

    await axios({
      method: "put",
      url: `${orderServiceUrl}/api/orders/${orderId}/payment-confirmation`,
      headers: {
        "Content-Type": "application/json",
        "X-User-ID": userId,
      },
      data: paymentData,
    });
  } catch (error) {
    console.error(`Failed to update order ${orderId}:`, error.message);
  }
};

// Create PayPal Order
const createPayPalOrder = async (
  orderId,
  amount,
  userId,
  returnUrl,
  cancelUrl
) => {
  // Get order details
  const order = await getOrderFromOrderService(orderId, userId);

  if (order.userId !== userId) {
    throw new Error("Not authorized to access this order");
  }

  const paymentAmount = amount || order.total;
  const accessToken = await getPayPalAccessToken();
  const config = getPayPalConfig();

  const paypalOrderData = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: orderId,
        description: "E-commerce Purchase",
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

  const response = await axios({
    method: "post",
    url: `${config.PAYPAL_API_BASE}/v2/checkout/orders`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: paypalOrderData,
  });

  return {
    orderId: order._id || order.id,
    paypalOrderId: response.data.id,
    links: response.data.links,
  };
};

// Capture PayPal Payment
const capturePayPalPayment = async (orderId, paypalOrderId, userId) => {
  const order = await getOrderFromOrderService(orderId, userId);

  if (order.userId !== userId) {
    throw new Error("Not authorized to access this order");
  }

  const config = getPayPalConfig();
  const accessToken = await getPayPalAccessToken();

  // Capture payment
  const response = await axios({
    method: "post",
    url: `${config.PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (response.data.status !== "COMPLETED") {
    throw new Error("Payment was not completed successfully");
  }

  // Generate transaction ID
  const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
    },
  });

  // Update order status
  await updateOrderStatus(
    orderId,
    {
      paymentStatus: "paid",
      status: "confirmed",
      paymentId: transactionId,
      paymentMethod: "paypal",
    },
    userId
  );

  return { payment, order };
};

// Get Payment History
const getPaymentHistory = async (userId) => {
  return await Payment.find({ user_id: userId }).sort({ createdAt: -1 });
};

// Get Payment by Transaction ID
const getPaymentByTransactionId = async (transactionId, userId) => {
  const payment = await Payment.findOne({ transaction_id: transactionId });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.user_id !== userId) {
    throw new Error("Not authorized to access this payment");
  }

  return payment;
};

module.exports = {
  createPayPalOrder,
  capturePayPalPayment,
  getPaymentHistory,
  getPaymentByTransactionId,
};
