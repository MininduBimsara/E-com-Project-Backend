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
      // Add your production domain here
    ];

    console.log(`🌍 [CORS] Request from origin: ${origin}`);

    // Allow requests with no origin (mobile apps, curl, etc.)
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
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
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

// Health check endpoint
app.get("/health", (req, res) => {
  console.log(`💓 [GATEWAY] Health check requested`);
  res.status(200).json({
    service: "API Gateway",
    status: "healthy",
    timestamp: new Date().toISOString(),
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
});
