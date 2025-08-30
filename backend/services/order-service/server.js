const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

dotenv.config();

const orderRoutes = require("./routes/orderRoutes");
const { rabbitmqManager } = require("../../shared/utils/rabbitmq");
const { orderEventConsumer } = require("./events/orderEventConsumer");

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

app.use("/", orderRoutes);

app.get("/health", (req, res) => {
  const rabbitmqHealth = rabbitmqManager.isHealthy();
  res.status(200).json({
    service: "Order Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    rabbitmq: rabbitmqHealth ? "connected" : "disconnected",
  });
});

app.use((err, req, res, next) => {
  console.error("Order service error:", err);
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

    // Initialize RabbitMQ connection
    if (process.env.ENABLE_RABBITMQ !== "false") {
      try {
        await rabbitmqManager.connect();
        console.log("✅ [Order Service] RabbitMQ connected successfully");

        await orderEventConsumer.initialize();
        console.log("✅ [Order Service] Event consumers initialized");
      } catch (error) {
        console.error(
          "❌ [Order Service] RabbitMQ setup failed:",
          error.message
        );
        console.log("⚠️ [Order Service] Continuing without RabbitMQ...");
      }
    }

    const PORT = process.env.PORT || 4003;
    app.listen(PORT, () => {
      console.log(`🚀 Order Service running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `🐰 RabbitMQ: ${
          rabbitmqManager.isHealthy() ? "Connected" : "Disconnected"
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
