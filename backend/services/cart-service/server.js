const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

dotenv.config();

const cartRoutes = require("./routes/cartRoutes");

// Smart RabbitMQ import that works in both local and Docker environments
let rabbitmqManager = null;
let cartEventConsumer = null;

// Function to safely import RabbitMQ modules
function loadRabbitMQModules() {
  const possiblePaths = [
    "./shared/utils/rabbitmq", // Docker container path
    "../../shared/utils/rabbitmq", // Local development path
  ];

  for (const modulePath of possiblePaths) {
    try {
      const { rabbitmqManager: rmqManager } = require(modulePath);
      const {
        cartEventConsumer: eventConsumer,
      } = require("./events/cartEventConsumer");

      console.log(`✅ Found RabbitMQ module at: ${modulePath}`);
      return { rabbitmqManager: rmqManager, cartEventConsumer: eventConsumer };
    } catch (err) {
      console.log(`❌ Failed to load from ${modulePath}: ${err.message}`);
      continue;
    }
  }

  console.log("⚠️ RabbitMQ module not found, continuing without it...");
  return { rabbitmqManager: null, cartEventConsumer: null };
}

// Load RabbitMQ modules
const { rabbitmqManager: rmqManager, cartEventConsumer: eventConsumer } =
  loadRabbitMQModules();
rabbitmqManager = rmqManager;
cartEventConsumer = eventConsumer;

const app = express();

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

app.use("/", cartRoutes);

app.get("/health", (req, res) => {
  const rabbitmqHealth = rabbitmqManager ? rabbitmqManager.isHealthy() : false;
  res.status(200).json({
    service: "Cart Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    rabbitmq: rabbitmqHealth ? "connected" : "disconnected",
  });
});

app.use((err, req, res, next) => {
  console.error("Cart service error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");

    if (process.env.ENABLE_RABBITMQ !== "false" && rabbitmqManager) {
      try {
        await rabbitmqManager.connect();
        console.log("✅ [Cart Service] RabbitMQ connected successfully");

        if (cartEventConsumer) {
          await cartEventConsumer.initialize();
          console.log("✅ [Cart Service] Event consumers initialized");
        }
      } catch (error) {
        console.error(
          "❌ [Cart Service] RabbitMQ setup failed:",
          error.message
        );
        console.log("⚠️ [Cart Service] Continuing without RabbitMQ...");
      }
    } else {
      console.log("⚠️ [Cart Service] RabbitMQ disabled or not available");
    }

    const PORT = process.env.PORT || 4002;
    app.listen(PORT, () => {
      console.log(`🚀 Cart Service running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `🐰 RabbitMQ: ${
          rabbitmqManager && rabbitmqManager.isHealthy()
            ? "Connected"
            : "Disconnected"
        }`
      );
    });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  if (rabbitmqManager) {
    await rabbitmqManager.close();
  }
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  if (rabbitmqManager) {
    await rabbitmqManager.close();
  }
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});

startServer();
