// controllers/paymentController.js - Updated to pass auth token to service
const paymentService = require("../services/paymentService");

// Create PayPal Order
exports.createPayPalOrder = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    console.log(`🚀 PayPal order creation request:`, {
      orderId,
      amount,
      userId: req.user?.id,
      hasToken: !!req.token,
      userAgent: req.headers["user-agent"],
    });

    if (!req.user) {
      console.error("❌ Authentication required for PayPal order creation");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!orderId) {
      console.error("❌ Order ID is required");
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const origin =
      req.headers.origin || process.env.FRONTEND_URL || "http://localhost:5173";
    const returnUrl = `${origin}/payment-success?orderId=${orderId}`;
    const cancelUrl = `${origin}/checkout?orderId=${orderId}`;

    console.log(`🔗 Payment URLs:`, { returnUrl, cancelUrl });

    // Pass the auth token to the service so it can authenticate with Order service
    const result = await paymentService.createPayPalOrder(
      orderId,
      amount,
      req.user.id,
      returnUrl,
      cancelUrl,
      req.token // Pass the JWT token for Order service authentication
    );

    console.log(`✅ PayPal order created successfully:`, {
      orderId: result.orderId,
      paypalOrderId: result.paypalOrderId,
      linksCount: result.links?.length || 0,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Create PayPal Order Error:", {
      message: error.message,
      orderId: req.body?.orderId,
      userId: req.user?.id,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create PayPal order",
    });
  }
};

// Capture PayPal Payment
exports.capturePayPalOrder = async (req, res) => {
  try {
    const { orderId, paypalOrderId } = req.body;

    console.log(`💳 PayPal payment capture request:`, {
      orderId,
      paypalOrderId,
      userId: req.user?.id,
      hasToken: !!req.token,
    });

    if (!req.user) {
      console.error("❌ Authentication required for payment capture");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!orderId || !paypalOrderId) {
      console.error("❌ Missing required parameters:", {
        orderId,
        paypalOrderId,
      });
      return res.status(400).json({
        success: false,
        message: "Order ID and PayPal Order ID are required",
      });
    }

    // Pass the auth token to the service so it can authenticate with Order service
    const result = await paymentService.capturePayPalPayment(
      orderId,
      paypalOrderId,
      req.user.id,
      req.token // Pass the JWT token for Order service authentication
    );

    console.log(`🎉 PayPal payment captured successfully:`, {
      orderId,
      paypalOrderId,
      transactionId: result.payment?.transaction_id,
      amount: result.payment?.amount,
    });

    res.status(200).json({
      success: true,
      message: "Payment captured successfully",
      data: {
        payment: result.payment,
        order: result.order,
        transactionId: result.payment?.transaction_id,
      },
    });
  } catch (error) {
    console.error("❌ Capture PayPal Payment Error:", {
      message: error.message,
      orderId: req.body?.orderId,
      paypalOrderId: req.body?.paypalOrderId,
      userId: req.user?.id,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: error.message || "Failed to capture PayPal payment",
    });
  }
};

// Get Payment History
exports.getPaymentHistory = async (req, res) => {
  try {
    console.log(`📜 Payment history request for user: ${req.user?.id}`);

    if (!req.user) {
      console.error("❌ Authentication required for payment history");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const payments = await paymentService.getPaymentHistory(req.user.id);

    console.log(`✅ Payment history retrieved: ${payments.length} payments`);

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("❌ Get Payment History Error:", {
      message: error.message,
      userId: req.user?.id,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve payment history",
    });
  }
};

// Get Payment Details
exports.getPaymentDetails = async (req, res) => {
  try {
    const { transactionId } = req.params;

    console.log(`🔍 Payment details request:`, {
      transactionId,
      userId: req.user?.id,
    });

    if (!req.user) {
      console.error("❌ Authentication required for payment details");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!transactionId) {
      console.error("❌ Transaction ID is required");
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    const payment = await paymentService.getPaymentByTransactionId(
      transactionId,
      req.user.id
    );

    console.log(`✅ Payment details retrieved:`, {
      transactionId,
      amount: payment.amount,
      status: payment.payment_status,
    });

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("❌ Get Payment Details Error:", {
      message: error.message,
      transactionId: req.params?.transactionId,
      userId: req.user?.id,
      stack: error.stack,
    });

    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("Not authorized")
      ? 403
      : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to retrieve payment details",
    });
  }
};

module.exports = exports;
