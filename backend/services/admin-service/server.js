const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const adminRoutes = require("./routes/adminRoutes");

dotenv.config();

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

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "Admin Service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("Admin-service Backend is running 🚀");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Admin service error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

const PORT = process.env.PORT || 4006;
app.listen(PORT, () => console.log(`Admin Service running on port ${PORT}`));
