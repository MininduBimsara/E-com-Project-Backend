// backend/services/product-service/events/productEventConsumer.js
const {
  rabbitmqManager,
  EVENT_TYPES,
} = require("../../../shared/utils/rabbitmq");
const productRepository = require("../Repository/productRepository");

class ProductEventConsumer {
  constructor() {
    this.serviceName = "product-service";
  }

  async initialize() {
    try {
      const routingKeys = [EVENT_TYPES.ORDER_CREATED];

      await rabbitmqManager.setupConsumer(
        this.serviceName,
        routingKeys,
        this.handleMessage.bind(this),
        {
          prefetch: 5,
          queueArguments: {
            "x-max-retries": 3,
          },
        }
      );

      console.log(
        `👂 [ProductEventConsumer] Consumer initialized for events: ${routingKeys.join(
          ", "
        )}`
      );
    } catch (error) {
      console.error(
        `❌ [ProductEventConsumer] Failed to initialize consumer:`,
        error.message
      );
      throw error;
    }
  }

  async handleMessage(message, routingKey) {
    try {
      console.log(`📥 [ProductEventConsumer] Processing event: ${routingKey}`, {
        correlationId: message.metadata?.correlationId,
        source: message.metadata?.source,
      });

      switch (routingKey) {
        case EVENT_TYPES.ORDER_CREATED:
          await this.handleOrderCreated(message.data);
          break;
        default:
          console.warn(
            `⚠️ [ProductEventConsumer] Unknown event type: ${routingKey}`
          );
      }
    } catch (error) {
      console.error(
        `❌ [ProductEventConsumer] Error processing ${routingKey}:`,
        error.message
      );
      throw error;
    }
  }

  async handleOrderCreated(orderData) {
    try {
      console.log(`📦 [ProductEventConsumer] Processing order created event:`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        itemCount: orderData.items?.length || 0,
      });

      const stockUpdates = [];
      const errors = [];

      // Process each item in the order
      for (const item of orderData.items) {
        try {
          console.log(
            `📦 [ProductEventConsumer] Updating stock for product: ${item.productId}`,
            {
              quantity: item.quantity,
              orderId: orderData.orderId,
            }
          );

          // Find the product
          const product = await productRepository.findById(item.productId);

          if (!product) {
            const error = `Product not found: ${item.productId}`;
            console.error(`❌ [ProductEventConsumer] ${error}`);
            errors.push({ productId: item.productId, error });
            continue;
          }

          // Check if there's enough stock
          if (product.stock < item.quantity) {
            const error = `Insufficient stock for product ${item.productId}. Available: ${product.stock}, Required: ${item.quantity}`;
            console.error(`❌ [ProductEventConsumer] ${error}`);
            errors.push({ productId: item.productId, error });
            continue;
          }

          // Update stock (decrease by ordered quantity)
          const updatedProduct = await productRepository.updateStock(
            item.productId,
            -item.quantity // Negative to decrease stock
          );

          if (updatedProduct) {
            stockUpdates.push({
              productId: item.productId,
              previousStock: product.stock,
              newStock: updatedProduct.stock,
              quantityDeducted: item.quantity,
            });

            console.log(
              `✅ [ProductEventConsumer] Stock updated for product ${item.productId}:`,
              {
                previousStock: product.stock,
                newStock: updatedProduct.stock,
                quantityDeducted: item.quantity,
              }
            );
          } else {
            const error = `Failed to update stock for product: ${item.productId}`;
            console.error(`❌ [ProductEventConsumer] ${error}`);
            errors.push({ productId: item.productId, error });
          }
        } catch (error) {
          console.error(
            `❌ [ProductEventConsumer] Error updating stock for product ${item.productId}:`,
            error.message
          );
          errors.push({ productId: item.productId, error: error.message });
        }
      }

      // Log summary
      console.log(
        `📦 [ProductEventConsumer] Stock update summary for order ${orderData.orderId}:`,
        {
          totalItems: orderData.items.length,
          successfulUpdates: stockUpdates.length,
          errors: errors.length,
          stockUpdates,
          errors,
        }
      );

      // Optionally publish stock updated event for analytics
      if (stockUpdates.length > 0) {
        try {
          await rabbitmqManager.publishEvent(
            EVENT_TYPES.STOCK_UPDATED,
            {
              orderId: orderData.orderId,
              userId: orderData.userId,
              stockUpdates,
              updatedAt: new Date().toISOString(),
            },
            {
              source: this.serviceName,
              version: "1.0",
            }
          );
        } catch (error) {
          console.warn(
            `⚠️ [ProductEventConsumer] Failed to publish stock updated event:`,
            error.message
          );
          // Don't throw - stock update succeeded
        }
      }

      // If there were critical errors, log them but don't fail the message
      // The order has already been created, so we need to handle stock issues separately
      if (errors.length > 0) {
        console.warn(
          `⚠️ [ProductEventConsumer] Some stock updates failed for order ${orderData.orderId}:`,
          errors
        );
        // In a real system, you might want to:
        // 1. Send notification to admin
        // 2. Flag order for manual review
        // 3. Create compensation event
      }
    } catch (error) {
      console.error(
        `❌ [ProductEventConsumer] Failed to handle order created event:`,
        error.message
      );
      throw error;
    }
  }
}

const productEventConsumer = new ProductEventConsumer();
module.exports = { productEventConsumer };

// backend/services/product-service/events/productEventPublisher.js
const {
  rabbitmqManager,
  EVENT_TYPES,
} = require("../../../shared/utils/rabbitmq");

class ProductEventPublisher {
  constructor() {
    this.serviceName = "product-service";
  }

  async publishStockUpdated(stockUpdateData) {
    try {
      const eventData = {
        orderId: stockUpdateData.orderId,
        userId: stockUpdateData.userId,
        stockUpdates: stockUpdateData.stockUpdates,
        updatedAt: new Date().toISOString(),
      };

      const correlationId = await rabbitmqManager.publishEvent(
        EVENT_TYPES.STOCK_UPDATED,
        eventData,
        {
          source: this.serviceName,
          version: "1.0",
        }
      );

      console.log(`📤 [ProductEventPublisher] Stock updated event published:`, {
        orderId: stockUpdateData.orderId,
        updateCount: stockUpdateData.stockUpdates.length,
        correlationId,
      });

      return correlationId;
    } catch (error) {
      console.error(
        `❌ [ProductEventPublisher] Failed to publish stock updated event:`,
        error.message
      );
      return null;
    }
  }
}

const productEventPublisher = new ProductEventPublisher();
module.exports = { productEventPublisher };

// backend/services/product-service/server.js (Updated)
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

const productRoutes = require("./routes/productRoutes");
const { rabbitmqManager } = require("../../shared/utils/rabbitmq");
const { productEventConsumer } = require("./events/productEventConsumer");

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

// Serve static files for product images
const uploadPath = path.join(__dirname, "public/product-images");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

app.use("/product-images", express.static(uploadPath));

// Health check endpoint with RabbitMQ status
app.get("/health", (req, res) => {
  const rabbitmqHealth = rabbitmqManager.isHealthy();

  res.status(200).json({
    service: "Product Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    rabbitmq: rabbitmqHealth ? "connected" : "disconnected",
  });
});

// API routes
app.use("/", productRoutes);

// Database connection and server startup
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");

    // Initialize RabbitMQ connection
    if (process.env.ENABLE_RABBITMQ !== "false") {
      try {
        await rabbitmqManager.connect();
        console.log("✅ [Product Service] RabbitMQ connected successfully");

        // Initialize event consumers
        await productEventConsumer.initialize();
        console.log("✅ [Product Service] Event consumers initialized");
      } catch (error) {
        console.error(
          "❌ [Product Service] RabbitMQ setup failed:",
          error.message
        );
        console.log("⚠️ [Product Service] Continuing without RabbitMQ...");
      }
    }

    const PORT = process.env.PORT || 4001;
    app.listen(PORT, () => {
      console.log(`🚀 Product Service running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 API URL: http://localhost:${PORT}/api/products`);
      console.log(`🖼️  Images URL: http://localhost:${PORT}/product-images`);
      console.log(
        `🐰 RabbitMQ: ${
          rabbitmqManager.isHealthy() ? "Connected" : "Disconnected"
        }`
      );
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

// Global error handler
app.use((err, req, res, next) => {
  console.error("Product service error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await rabbitmqManager.close();
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await rabbitmqManager.close();
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});

startServer();
