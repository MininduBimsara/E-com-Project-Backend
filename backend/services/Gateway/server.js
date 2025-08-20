// backend/services/Gateway/server.js (Updated)
const express = require("express");
const proxy = require("express-http-proxy");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log("\n🌐 [GATEWAY] Incoming Request:");
  console.log(`📍 ${req.method} ${req.originalUrl}`);
  console.log(`🔑 Headers:`, {
    origin: req.headers.origin,
    "content-type": req.headers["content-type"],
    authorization: req.headers.authorization
      ? `Bearer ${req.headers.authorization.substring(7, 20)}...`
      : "None",
    "user-agent": req.headers["user-agent"]?.substring(0, 50) + "...",
  });
  console.log(`📦 Body:`, req.body);
  next();
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5174",
    ];

    console.log(`🌍 [CORS] Request from origin: ${origin}`);

    if (!origin) {
      console.log(`✅ [CORS] No origin - allowing request`);
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ [CORS] Origin allowed: ${origin}`);
      callback(null, true);
    } else {
      console.log(`❌ [CORS] Origin blocked: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "X-Requested-With",
  ],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Helper to forward cookies and auth headers with debugging
const forwardAuth = {
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    console.log(
      `🔄 [GATEWAY] Forwarding to service:`,
      proxyReqOpts.hostname + ":" + proxyReqOpts.port
    );

    if (srcReq.headers.cookie) {
      proxyReqOpts.headers["cookie"] = srcReq.headers.cookie;
      console.log(`🍪 [GATEWAY] Forwarding cookies`);
    }
    if (srcReq.headers.authorization) {
      proxyReqOpts.headers["authorization"] = srcReq.headers.authorization;
      console.log(`🔐 [GATEWAY] Forwarding auth header`);
    }
    return proxyReqOpts;
  },
  proxyReqBodyDecorator: (bodyContent, srcReq) => {
    if (bodyContent) {
      console.log(`📤 [GATEWAY] Forwarding body:`, bodyContent.toString());
    }
    return bodyContent;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    console.log(`📥 [GATEWAY] Response from service:`, {
      status: proxyRes.statusCode,
      headers: {
        "content-type": proxyRes.headers["content-type"],
        "set-cookie": proxyRes.headers["set-cookie"] ? "Present" : "None",
      },
    });

    if (proxyResData) {
      const dataString = proxyResData.toString("utf8");
      console.log(
        `📊 [GATEWAY] Response data:`,
        dataString.substring(0, 200) + (dataString.length > 200 ? "..." : "")
      );
    }

    return proxyResData;
  },
};

// Health check endpoint with service health checks
app.get("/health", async (req, res) => {
  console.log(`💓 [GATEWAY] Health check requested`);

  const services = [
    { name: "User Service", url: "http://localhost:4000/health" },
    { name: "Product Service", url: "http://localhost:4001/health" },
    { name: "Cart Service", url: "http://localhost:4002/health" },
    { name: "Order Service", url: "http://localhost:4003/health" },
    { name: "Payment Service", url: "http://localhost:4004/health" },
    { name: "Admin Service", url: "http://localhost:4006/health" },
  ];

  const serviceStatus = {};

  for (const service of services) {
    try {
      const axios = require("axios");
      const response = await axios.get(service.url, { timeout: 2000 });
      serviceStatus[service.name] = {
        status: "healthy",
        rabbitmq: response.data.rabbitmq || "unknown",
        mongodb: response.data.mongodb || "unknown",
      };
    } catch (error) {
      serviceStatus[service.name] = {
        status: "unhealthy",
        error: error.message,
      };
    }
  }

  res.status(200).json({
    service: "API Gateway",
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: serviceStatus,
  });
});

// Service routes with enhanced error handling
app.use(
  "/api/auth",
  proxy("http://localhost:4000", {
    ...forwardAuth,
    proxyErrorHandler: (err, res, next) => {
      console.error(
        "❌ [GATEWAY] User service (auth) proxy error:",
        err.message
      );
      res.status(503).json({
        message: "User service unavailable",
        service: "auth",
        error: err.message,
      });
    },
  })
);

app.use(
  "/api/users",
  proxy("http://localhost:4000", {
    ...forwardAuth,
    proxyErrorHandler: (err, res, next) => {
      console.error("❌ [GATEWAY] User service proxy error:", err.message);
      res.status(503).json({
        message: "User service unavailable",
        service: "users",
        error: err.message,
      });
    },
  })
);

app.use(
  "/product-images",
  proxy("http://localhost:4001", {
    ...forwardAuth,
    proxyErrorHandler: (err, res, next) => {
      console.error("❌ [GATEWAY] Product images proxy error:", err.message);
      res.status(503).json({
        message: "Product images service unavailable",
        service: "product-images",
        error: err.message,
      });
    },
  })
);

app.use(
  "/api/products",
  proxy("http://localhost:4001", {
    ...forwardAuth,
    proxyErrorHandler: (err, res, next) => {
      console.error("❌ [GATEWAY] Product service proxy error:", err.message);
      res.status(503).json({
        message: "Product service unavailable",
        service: "products",
        error: err.message,
      });
    },
  })
);

app.use(
  "/api/cart",
  proxy("http://localhost:4002", {
    ...forwardAuth,
    proxyErrorHandler: (err, res, next) => {
      console.error("❌ [GATEWAY] Cart service proxy error:", err.message);
      res.status(503).json({
        message: "Cart service unavailable",
        service: "cart",
        error: err.message,
      });
    },
  })
);

app.use(
  "/api/orders",
  proxy("http://localhost:4003", {
    ...forwardAuth,
    proxyErrorHandler: (err, res, next) => {
      console.error("❌ [GATEWAY] Order service proxy error:", err.message);
      res.status(503).json({
        message: "Order service unavailable",
        service: "orders",
        error: err.message,
      });
    },
  })
);

app.use(
  "/api/payments",
  proxy("http://localhost:4004", {
    ...forwardAuth,
    proxyErrorHandler: (err, res, next) => {
      console.error("❌ [GATEWAY] Payment service proxy error:", err.message);
      res.status(503).json({
        message: "Payment service unavailable",
        service: "payments",
        error: err.message,
      });
    },
  })
);

app.use(
  "/api/admin",
  proxy("http://localhost:4006", {
    ...forwardAuth,
    proxyErrorHandler: (err, res, next) => {
      console.error("❌ [GATEWAY] Admin service proxy error:", err.message);
      res.status(503).json({
        message: "Admin service unavailable",
        service: "admin",
        error: err.message,
      });
    },
  })
);

// 404 handler
app.use((req, res) => {
  console.log(`❓ [GATEWAY] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("💥 [GATEWAY] Global error:", err);
  res.status(500).json({
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 [GATEWAY] API Gateway running on port ${PORT}`);
  console.log(
    `🌍 [GATEWAY] CORS enabled for:`,
    process.env.FRONTEND_URL || "http://localhost:5173"
  );
  console.log(`🔗 [GATEWAY] Proxying to services:`);
  console.log(`   - User Service: http://localhost:4000`);
  console.log(`   - Product Service: http://localhost:4001`);
  console.log(`   - Cart Service: http://localhost:4002`);
  console.log(`   - Order Service: http://localhost:4003`);
  console.log(`   - Payment Service: http://localhost:4004`);
  console.log(`   - Admin Service: http://localhost:4006`);
});

// Package.json dependencies for each service
// Add to each service's package.json:

/*
// shared/package.json (if you create a shared package)
{
  "name": "@ecostore/shared",
  "version": "1.0.0",
  "description": "Shared utilities for EcoStore microservices",
  "main": "utils/rabbitmq.js",
  "dependencies": {
    "amqplib": "^0.10.3"
  }
}

// backend/services/user-service/package.json (Add to existing dependencies)
{
  "dependencies": {
    "amqplib": "^0.10.3"
  }
}

// backend/services/admin-service/package.json (Add to existing dependencies)
{
  "dependencies": {
    "amqplib": "^0.10.3"
  }
}

// backend/services/order-service/package.json (Add to existing dependencies)
{
  "dependencies": {
    "amqplib": "^0.10.3"
  }
}

// backend/services/cart-service/package.json (Add to existing dependencies)
{
  "dependencies": {
    "amqplib": "^0.10.3"
  }
}

// backend/services/product-service/package.json (Add to existing dependencies)
{
  "dependencies": {
    "amqplib": "^0.10.3"
  }
}

// backend/services/payment-service/package.json (Add to existing dependencies)
{
  "dependencies": {
    "amqplib": "^0.10.3"
  }
}

// backend/services/Gateway/package.json (Add to existing dependencies)
{
  "dependencies": {
    "axios": "^1.6.0"
  }
}
*/

// Environment Variables Template
// Add these to each service's .env file:

/*
// .env template for all services
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=ecostore.events
RABBITMQ_QUEUE_PREFIX=ecostore
ENABLE_RABBITMQ=true
RABBITMQ_RETRY_ATTEMPTS=3
RABBITMQ_RETRY_DELAY=1000

// Additional service-specific environment variables:
// USER_SERVICE_URL=http://localhost:4000
// PRODUCT_SERVICE_URL=http://localhost:4001
// CART_SERVICE_URL=http://localhost:4002
// ORDER_SERVICE_URL=http://localhost:4003
// PAYMENT_SERVICE_URL=http://localhost:4004
// ADMIN_SERVICE_URL=http://localhost:4006
// FRONTEND_URL=http://localhost:5173
*/
