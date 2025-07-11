const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { validateEnvironment } = require("./config/env");
const { connectDatabase, createIndexes } = require("./config/database");
const {
  securityHeaders,
  generalLimiter,
} = require("./middlewares/securityMiddleware");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const googleAuthRoutes = require("./routes/googleAuthRoutes");

dotenv.config();

// Validate environment variables
validateEnvironment();

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(generalLimiter);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "User Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/google", googleAuthRoutes);

app.get("/", (req, res) => {
  res.send("User-service Backend is running 🚀");
});


// Initialize database and start server
const startServer = async () => {
  try {
    await connectDatabase();
    await createIndexes();

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
