// routes/paymentRoutes.js
const express = require("express");
const paymentController = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(protect);

// PayPal payment routes
router.post("/paypal/create-order", paymentController.createPayPalOrder);
router.post("/paypal/capture-order", paymentController.capturePayPalOrder);

// Payment management
router.get("/history", paymentController.getPaymentHistory);
router.get("/:transactionId", paymentController.getPaymentDetails);

module.exports = router;
