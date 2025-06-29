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

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/orders", paymentRoutes);

const PORT = process.env.PORT || 4004;

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "Order Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Database connection and server startup
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/payment-service"
  )
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
