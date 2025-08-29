// backend/services/user-service/events/userEventPublisher.js
const {
  rabbitmqManager,
  EVENT_TYPES,
} = require("../../../shared/utils/rabbitmq");

class UserEventPublisher {
  constructor() {
    this.serviceName = "user-service";
  }

  async publishUserCreated(userData) {
    try {
      const eventData = {
        userId: userData._id || userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role || "customer",
        createdAt: userData.createdAt || new Date().toISOString(),
        profileImage: userData.profileImage || null,
      };

      const correlationId = await rabbitmqManager.publishEvent(
        EVENT_TYPES.USER_CREATED,
        eventData,
        {
          source: this.serviceName,
          version: "1.0",
        }
      );

      console.log(`📤 [UserEventPublisher] User created event published:`, {
        userId: eventData.userId,
        email: eventData.email,
        role: eventData.role,
        correlationId,
      });

      return correlationId;
    } catch (error) {
      console.error(
        `❌ [UserEventPublisher] Failed to publish user created event:`,
        error.message
      );
      // Don't throw - let registration continue even if event fails
      return null;
    }
  }
}

const userEventPublisher = new UserEventPublisher();
module.exports = { userEventPublisher };

// backend/services/user-service/Services/authService.js (Updated)
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserRepository = require("../Repository/UserRepository");
const AuthRepository = require("../Repository/AuthRepository");
const { userEventPublisher } = require("../events/userEventPublisher");

const registerUser = async (userData, profileImageFilename = null) => {
  const { username, email, password, role } = userData;

  if (!username || !email || !password) {
    throw new Error("All fields are required");
  }

  const existingUser = await UserRepository.findByEmail(email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await UserRepository.create({
    username,
    email,
    password: hashedPassword,
    role: role || "customer",
    profileImage: profileImageFilename,
  });

  const token = generateToken(user._id, user.role);

  // Publish user created event
  try {
    await userEventPublisher.publishUserCreated(user);
  } catch (error) {
    console.error("Failed to publish user created event:", error.message);
    // Continue with registration even if event fails
  }

  return {
    token,
    user: formatUserResponse(user),
  };
};

const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const user = await UserRepository.findByEmail(email);
  if (!user) throw new Error("Invalid credentials");

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new Error("Invalid credentials");

  console.log("🔍 [authService.loginUser] User found:", {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  return generateUserResponse(user);
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await UserRepository.findById(userId);
  if (!user) throw new Error("User not found");

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new Error("Current password is incorrect");

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  await AuthRepository.updatePassword(userId, hashedNewPassword);

  return { message: "Password changed successfully" };
};

const updateUserProfile = async (userId, updateData) => {
  const updatedUser = await UserRepository.updateById(userId, updateData);
  if (!updatedUser) throw new Error("User not found");

  return formatUserResponse(updatedUser);
};

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

const generateUserResponse = (user) => {
  const userResponse = {
    token: generateToken(user._id, user.role),
    user: formatUserResponse(user),
  };

  console.log(
    "🔍 [authService.generateUserResponse] Generated response:",
    userResponse
  );
  return userResponse;
};

const formatUserResponse = (user) => {
  const formattedUser = {
    id: user._id,
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
  };

  console.log(
    "🔍 [authService.formatUserResponse] Formatted user:",
    formattedUser
  );
  return formattedUser;
};

const getUserData = (user) => formatUserResponse(user);

module.exports = {
  registerUser,
  loginUser,
  changePassword,
  updateUserProfile,
  generateToken,
  getUserData,
  formatUserResponse,
};

// backend/services/user-service/server.js (Updated)
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
const { rabbitmqManager } = require("../../shared/utils/rabbitmq");

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

// Health check endpoint with RabbitMQ status
app.get("/health", async (req, res) => {
  const rabbitmqHealth = rabbitmqManager.isHealthy();

  res.status(200).json({
    service: "User Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    rabbitmq: rabbitmqHealth ? "connected" : "disconnected",
  });
});

app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/google", googleAuthRoutes);

app.get("/", (req, res) => {
  res.send("User-service Backend is running 🚀");
});

// Initialize RabbitMQ and database
const startServer = async () => {
  try {
    await connectDatabase();
    await createIndexes();

    // Initialize RabbitMQ connection
    if (process.env.ENABLE_RABBITMQ !== "false") {
      try {
        await rabbitmqManager.connect();
        console.log("✅ [User Service] RabbitMQ connected successfully");
      } catch (error) {
        console.error(
          "❌ [User Service] RabbitMQ connection failed:",
          error.message
        );
        console.log("⚠️ [User Service] Continuing without RabbitMQ...");
      }
    }

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`🚀 User Service running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `🐰 RabbitMQ: ${
          rabbitmqManager.isHealthy() ? "Connected" : "Disconnected"
        }`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await rabbitmqManager.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await rabbitmqManager.close();
  process.exit(0);
});

startServer();
