// routes/paymentRoutes.js - Enhanced with better logging
const express = require("express");
const paymentController = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Request logging middleware
router.use((req, res, next) => {
  console.log(
    `💳 Payment Service: ${req.method} ${
      req.path
    } - ${new Date().toISOString()}`
  );
  console.log(`📋 Headers:`, {
    authorization: req.headers.authorization ? "Bearer [token]" : "none",
    "content-type": req.headers["content-type"] || "none",
    "user-agent": req.headers["user-agent"] ? "[present]" : "none",
  });
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📦 Body:`, {
      orderId: req.body.orderId || "none",
      amount: req.body.amount || "none",
      paypalOrderId: req.body.paypalOrderId || "none",
    });
  }
  next();
});

// All routes require authentication
router.use(protect);

// PayPal payment routes
router.post("/paypal/create-order", paymentController.createPayPalOrder);
router.post("/paypal/capture-order", paymentController.capturePayPalOrder);

// Payment management
router.get("/history", paymentController.getPaymentHistory);
router.get("/:transactionId", paymentController.getPaymentDetails);

// Response logging middleware
router.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    console.log(
      `📤 Payment Service Response: ${res.statusCode} for ${req.method} ${req.path}`
    );
    return originalSend.call(this, data);
  };
  next();
});

module.exports = router;
