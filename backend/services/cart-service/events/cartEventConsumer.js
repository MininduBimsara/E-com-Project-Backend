// backend/services/cart-service/events/cartEventConsumer.js
const {
  rabbitmqManager,
  EVENT_TYPES,
} = require("../../../shared/utils/rabbitmq");
const cartRepository = require("../repositories/cartRepository");

class CartEventConsumer {
  constructor() {
    this.serviceName = "cart-service";
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
        `👂 [CartEventConsumer] Consumer initialized for events: ${routingKeys.join(
          ", "
        )}`
      );
    } catch (error) {
      console.error(
        `❌ [CartEventConsumer] Failed to initialize consumer:`,
        error.message
      );
      throw error;
    }
  }

  async handleMessage(message, routingKey) {
    try {
      console.log(`📥 [CartEventConsumer] Processing event: ${routingKey}`, {
        correlationId: message.metadata?.correlationId,
        source: message.metadata?.source,
      });

      switch (routingKey) {
        case EVENT_TYPES.ORDER_CREATED:
          await this.handleOrderCreated(message.data);
          break;
        default:
          console.warn(
            `⚠️ [CartEventConsumer] Unknown event type: ${routingKey}`
          );
      }
    } catch (error) {
      console.error(
        `❌ [CartEventConsumer] Error processing ${routingKey}:`,
        error.message
      );
      throw error;
    }
  }

  async handleOrderCreated(orderData) {
    try {
      console.log(`🛒 [CartEventConsumer] Processing order created event:`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        itemCount: orderData.items?.length || 0,
      });

      // Find and clear the user's cart
      const cart = await cartRepository.findCartByUserId(orderData.userId);

      if (!cart) {
        console.log(
          `ℹ️ [CartEventConsumer] No cart found for user: ${orderData.userId}`
        );
        return;
      }

      if (cart.items.length === 0) {
        console.log(
          `ℹ️ [CartEventConsumer] Cart already empty for user: ${orderData.userId}`
        );
        return;
      }

      // Clear the cart
      cart.clearCart();
      await cartRepository.saveCart(cart);

      console.log(
        `✅ [CartEventConsumer] Cart cleared successfully for user: ${orderData.userId}`,
        {
          orderId: orderData.orderId,
          previousItemCount: cart.items.length,
        }
      );

      // Optionally publish cart cleared event for analytics
      try {
        await rabbitmqManager.publishEvent(
          EVENT_TYPES.CART_CLEARED,
          {
            userId: orderData.userId,
            orderId: orderData.orderId,
            clearedAt: new Date().toISOString(),
          },
          {
            source: this.serviceName,
            version: "1.0",
          }
        );
      } catch (error) {
        console.warn(
          `⚠️ [CartEventConsumer] Failed to publish cart cleared event:`,
          error.message
        );
        // Don't throw - cart clearing succeeded
      }
    } catch (error) {
      console.error(
        `❌ [CartEventConsumer] Failed to handle order created event:`,
        error.message
      );
      throw error;
    }
  }
}

const cartEventConsumer = new CartEventConsumer();
module.exports = { cartEventConsumer };

// backend/services/cart-service/events/cartEventPublisher.js
const {
  rabbitmqManager,
  EVENT_TYPES,
} = require("../../../shared/utils/rabbitmq");

class CartEventPublisher {
  constructor() {
    this.serviceName = "cart-service";
  }

  async publishCartCleared(userId, orderId) {
    try {
      const eventData = {
        userId,
        orderId,
        clearedAt: new Date().toISOString(),
      };

      const correlationId = await rabbitmqManager.publishEvent(
        EVENT_TYPES.CART_CLEARED,
        eventData,
        {
          source: this.serviceName,
          version: "1.0",
        }
      );

      console.log(`📤 [CartEventPublisher] Cart cleared event published:`, {
        userId,
        orderId,
        correlationId,
      });

      return correlationId;
    } catch (error) {
      console.error(
        `❌ [CartEventPublisher] Failed to publish cart cleared event:`,
        error.message
      );
      return null;
    }
  }
}

const cartEventPublisher = new CartEventPublisher();
module.exports = { cartEventPublisher };

// backend/services/cart-service/server.js (Updated)
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

dotenv.config();

const cartRoutes = require("./routes/cartRoutes");
const { rabbitmqManager } = require("../../shared/utils/rabbitmq");
const { cartEventConsumer } = require("./events/cartEventConsumer");

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

// Health check endpoint with RabbitMQ status
app.get("/health", (req, res) => {
  const rabbitmqHealth = rabbitmqManager.isHealthy();

  res.status(200).json({
    service: "Cart Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    rabbitmq: rabbitmqHealth ? "connected" : "disconnected",
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

// Database connection and server startup
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Initialize RabbitMQ connection
    if (process.env.ENABLE_RABBITMQ !== "false") {
      try {
        await rabbitmqManager.connect();
        console.log("✅ [Cart Service] RabbitMQ connected successfully");

        // Initialize event consumers
        await cartEventConsumer.initialize();
        console.log("✅ [Cart Service] Event consumers initialized");
      } catch (error) {
        console.error(
          "❌ [Cart Service] RabbitMQ setup failed:",
          error.message
        );
        console.log("⚠️ [Cart Service] Continuing without RabbitMQ...");
      }
    }

    const PORT = process.env.PORT || 4002;
    app.listen(PORT, () => {
      console.log(`🚀 Cart Service running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `🐰 RabbitMQ: ${
          rabbitmqManager.isHealthy() ? "Connected" : "Disconnected"
        }`
      );
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
};

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
