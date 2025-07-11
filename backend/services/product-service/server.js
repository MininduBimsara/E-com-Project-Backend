const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

const productRoutes = require("./routes/productRoutes");

dotenv.config();

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

// Cookie parser middleware
app.use(cookieParser());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory with CORS headers
app.use(
  "/product-images",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  },
  express.static(path.join(__dirname, "public", "product-images"))
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "Product Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Test image serving endpoint
app.get("/test-image", (req, res) => {
  const imagePath = path.join(__dirname, "public", "product-images");
  const files = fs.readdirSync(imagePath);
  res.json({
    message: "Image serving test",
    availableImages: files,
    imagePath: imagePath,
  });
});

// API routes
app.use("/", productRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });



const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`🚀 Product Service running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}/api/products`);
});

module.exports = app;
