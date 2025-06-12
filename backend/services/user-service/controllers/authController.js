const authService = require("../../Services/Common/authService");

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

    const result = await authService.loginUser(email, password);

    // Set cookie with JWT token
    res.cookie("token", result.token, cookieOptions);

    res.status(200).json({
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    res.status(error.message === "Invalid credentials" ? 400 : 500).json({
      message: error.message,
    });
  }
};

// Verify token handler
const verifyToken = async (req, res) => {
  try {
    const userData = authService.getUserData(req.user);

    res.status(200).json({
      user: userData,
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// Logout handler
const logout = (req, res) => {
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
