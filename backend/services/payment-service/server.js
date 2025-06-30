// ==============================================
// server.js
// ==============================================

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

dotenv.config();

const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/", paymentRoutes);

const PORT = process.env.PORT || 4004;

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "Payment Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Payment service error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Database connection and server startup
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/payment-service")
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Payment Service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection error:", error);
    process.exit(1);
  });
