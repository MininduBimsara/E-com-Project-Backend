// controllers/paymentController.js
const paymentService = require("../services/paymentService");

// Create PayPal Order
exports.createPayPalOrder = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const origin =
      req.headers.origin || process.env.FRONTEND_URL || "http://localhost:3000";
    const returnUrl = `${origin}/payment-success`;
    const cancelUrl = `${origin}/checkout?orderId=${orderId}`;

    const result = await paymentService.createPayPalOrder(
      orderId,
      amount,
      req.user.id,
      returnUrl,
      cancelUrl
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Create PayPal Order Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Capture PayPal Payment
exports.capturePayPalOrder = async (req, res) => {
  try {
    const { orderId, paypalOrderId } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const result = await paymentService.capturePayPalPayment(
      orderId,
      paypalOrderId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: "Payment captured successfully",
      data: result,
    });
  } catch (error) {
    console.error("Capture PayPal Payment Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Payment History
exports.getPaymentHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const payments = await paymentService.getPaymentHistory(req.user.id);

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Get Payment History Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Payment Details
exports.getPaymentDetails = async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const payment = await paymentService.getPaymentByTransactionId(
      transactionId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Get Payment Details Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = exports;
