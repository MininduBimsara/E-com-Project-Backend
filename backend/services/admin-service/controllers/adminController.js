// backend/services/admin-service/controllers/adminController.js
const adminService = require("../services/adminService");

// @desc    Login Admin
// @route   POST /api/admin/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const result = await adminService.login(email, password);

    // Set HTTP-only cookie with the token
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        admin: result.admin,
      },
    });
  } catch (error) {
    console.error("Login controller error:", error);
    res.status(401).json({
      success: false,
      message: error.message || "Login failed",
    });
  }
};

// @desc    Get Admin Profile
// @route   GET /api/admin/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    if (!req.admin || !req.admin._id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const admin = await adminService.getProfile(req.admin._id);

    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error("Get profile controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch profile",
    });
  }
};

// @desc    Get Dashboard Statistics
// @route   GET /api/admin/dashboard
// @access  Private
const getDashboard = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Dashboard controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard stats",
    });
  }
};

// @desc    Get All Users
// @route   GET /api/admin/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const users = await adminService.getAllUsers(
      parseInt(page),
      parseInt(limit),
      search
    );

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get users controller error:", error);

    if (error.message.includes("unavailable")) {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users",
    });
  }
};

// @desc    Get All Products
// @route   GET /api/admin/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", category = "" } = req.query;
    const products = await adminService.getAllProducts(
      parseInt(page),
      parseInt(limit),
      search,
      category
    );

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Get products controller error:", error);

    if (error.message.includes("unavailable")) {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch products",
    });
  }
};

// @desc    Get All Orders
// @route   GET /api/admin/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "" } = req.query;
    const orders = await adminService.getAllOrders(
      parseInt(page),
      parseInt(limit),
      status
    );

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get orders controller error:", error);

    if (error.message.includes("unavailable")) {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch orders",
    });
  }
};

// @desc    Update Order Status
// @route   PUT /api/admin/orders/:orderId/status
// @access  Private
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Basic validation
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    const result = await adminService.updateOrderStatus(orderId, status);

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: result,
    });
  } catch (error) {
    console.error("Update order status controller error:", error);

    if (error.message.includes("unavailable")) {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update order status",
    });
  }
};

// @desc    Update User Status
// @route   PUT /api/admin/users/:userId/status
// @access  Private
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    // Basic validation
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = ["active", "banned", "inactive"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    const result = await adminService.updateUserStatus(userId, status);

    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      data: result,
    });
  } catch (error) {
    console.error("Update user status controller error:", error);

    if (error.message.includes("unavailable")) {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update user status",
    });
  }
};

// @desc    Logout Admin
// @route   POST /api/admin/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Clear the HTTP-only cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      message: "Admin logged out successfully",
    });
  } catch (error) {
    console.error("Logout controller error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Logout failed",
    });
  }
};

module.exports = {
  login,
  getProfile,
  getDashboard,
  getUsers,
  getProducts,
  getOrders,
  updateOrderStatus,
  updateUserStatus,
  logout,
};
