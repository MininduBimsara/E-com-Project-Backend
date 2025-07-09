const express = require("express");
const {
  googleAuth,
  getCurrentUser,
  logout,
} = require("../controllers/googleAuthController");
const { authenticateToken } = require("../middlewares/authMiddleware");

const router = express.Router();

// Google authentication endpoint
router.post("/google", googleAuth);

// Get current authenticated user
router.get("/me", authenticateToken, getCurrentUser);

// Logout endpoint
router.post("/logout", logout);

module.exports = router;
