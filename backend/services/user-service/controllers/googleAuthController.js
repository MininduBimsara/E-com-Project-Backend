const { verifyGoogleToken } = require("../Services/googleAuthService");

// Google authentication handler
const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Google token is required",
      });
    }

    // Verify token and get user data
    const userData = await verifyGoogleToken(token);

    // Set authentication cookie
    res.cookie("token", userData.token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      data: userData,
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Google authentication failed",
      error: error.message,
    });
  }
};

// Get current authenticated user
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    return res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get current user",
    });
  }
};

// Logout handler
const logout = async (req, res) => {
  try {
    // Clear authentication cookie
    res.clearCookie("token", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

module.exports = {
  googleAuth,
  getCurrentUser,
  logout,
};
