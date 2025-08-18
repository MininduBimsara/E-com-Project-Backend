// backend/services/user-service/controllers/authController.js
const authService = require("../Services/authService");
const UserRepository = require("../Repository/UserRepository");

const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

// Registration handler
const register = async (req, res) => {
  try {
    const profileImageData = req.file ? req.file.filename : null;

    const result = await authService.registerUser(req.body, profileImageData);

    console.log("🔍 [authController.register] Registration result:", result);

    // Set cookie with JWT token
    res.cookie("token", result.token, cookieOptions);

    res.status(201).json({
      message: "User registered successfully",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    res.status(error.message === "User already exists" ? 400 : 500).json({
      message: error.message,
    });
  }
};

// Login handler
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔍 [authController.login] Login attempt for:", email);

    const result = await authService.loginUser(email, password);

    console.log("🔍 [authController.login] Login successful for:", {
      userId: result.user.id,
      username: result.user.username,
      role: result.user.role,
    });

    // Set cookie with JWT token
    res.cookie("token", result.token, cookieOptions);

    res.status(200).json({
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.log(
      "❌ [authController.login] Login failed for:",
      req.body.email,
      "Error:",
      error.message
    );
    res.status(error.message === "Invalid credentials" ? 400 : 500).json({
      message: error.message,
    });
  }
};

// Verify token handler
const verifyToken = async (req, res) => {
  try {
    // Get user from database to ensure we have the latest data including role
    const user = await UserRepository.findById(req.user.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const userData = authService.getUserData(user);

    console.log("🔍 [authController.verifyToken] Token verified for user:", {
      userId: userData.id,
      username: userData.username,
      role: userData.role,
    });

    res.status(200).json({
      user: userData,
    });
  } catch (error) {
    console.log(
      "❌ [authController.verifyToken] Token verification failed:",
      error.message
    );
    res.status(401).json({ message: error.message });
  }
};

// Logout handler
const logout = (req, res) => {
  console.log("🔍 [authController.logout] User logging out");

  // Clear the cookie
  res.clearCookie("token", { ...cookieOptions, maxAge: undefined });

  // Send a successful response
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

module.exports = {
  register,
  login,
  verifyToken,
  logout,
};
