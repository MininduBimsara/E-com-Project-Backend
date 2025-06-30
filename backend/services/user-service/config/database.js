const mongoose = require("mongoose");

// Database connection configuration
const connectDatabase = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maximum number of connections in the pool
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000, // Timeout for socket operations
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    };

    await mongoose.connect(process.env.MONGO_URI, options);

    console.log("✅ MongoDB connected successfully");

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

// Create indexes for better performance
const createIndexes = async () => {
  try {
    const User = require("../models/User");

    // Create indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ username: 1 });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ status: 1 });
    await User.collection.createIndex({ createdAt: -1 });

    console.log("✅ Database indexes created successfully");
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
  }
};

module.exports = {
  connectDatabase,
  createIndexes,
};
