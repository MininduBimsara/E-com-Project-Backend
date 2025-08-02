const express = require("express");
const proxy = require("express-http-proxy");
const dotenv = require("dotenv");
const cors = require("cors");

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


// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "API Gateway",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use(
  "/api/auth",
  proxy("http://localhost:4000", {
    proxyErrorHandler: (err, res, next) => {
      console.error("User service (auth) proxy error:", err);
      res.status(503).json({ message: "User service unavailable" });
    },
  })
);

// Proxy routes with error handling
app.use(
  "/api/users",
  proxy("http://localhost:4000", {
    proxyErrorHandler: (err, res, next) => {
      console.error("User service proxy error:", err);
      res.status(503).json({ message: "User service unavailable" });
    },
  })
);

app.use(
  "/product-images",
  proxy("http://localhost:4001", {
    proxyErrorHandler: (err, res, next) => {
      console.error("Product images proxy error:", err);
      res.status(503).json({ message: "Product images service unavailable" });
    },
  })
);

app.use(
  "/api/products",
  proxy("http://localhost:4001", {
    proxyErrorHandler: (err, res, next) => {
      console.error("Product service proxy error:", err);
      res.status(503).json({ message: "Product service unavailable" });
    },
  })
);

app.use(
  "/api/cart",
  proxy("http://localhost:4002", {
    proxyErrorHandler: (err, res, next) => {
      console.error("Cart service proxy error:", err);
      res.status(503).json({ message: "Cart service unavailable" });
    },
  })
);

app.use(
  "/api/orders",
  proxy("http://localhost:4003", {
    proxyErrorHandler: (err, res, next) => {
      console.error("Order service proxy error:", err);
      res.status(503).json({ message: "Order service unavailable" });
    },
  })
);

app.use(
  "/api/payments",
  proxy("http://localhost:4004", {
    proxyErrorHandler: (err, res, next) => {
      console.error("Payment service proxy error:", err);
      res.status(503).json({ message: "Payment service unavailable" });
    },
  })
);

app.use(
  "/api/admin",
  proxy("http://localhost:4005", {
    proxyErrorHandler: (err, res, next) => {
      console.error("Admin service proxy error:", err);
      res.status(503).json({ message: "Admin service unavailable" });
    },
  })
);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Gateway error:", err);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
