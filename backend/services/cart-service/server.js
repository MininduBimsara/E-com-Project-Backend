const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

dotenv.config();

const cartRoutes = require("./routes/cartRoutes");

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

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "Cart Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use("/", cartRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Cart service error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(4002, () => console.log("Cart Service running on port 4002"));
  })
  .catch((err) => console.error("MongoDB connection failed:", err));
