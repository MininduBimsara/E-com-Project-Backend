const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Login admin
const login = async (email, password) => {
  try {
    // Find admin by email
    const admin = await Admin.findOne({ email });

    if (!admin) {
      throw new Error("Invalid credentials");
    }

    // Check if admin is active
    if (admin.status !== "active") {
      throw new Error("Admin account is inactive");
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Update last login
    await admin.updateLastLogin();

    // Generate token
    const token = generateToken(admin._id);

    return {
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
      },
      token,
    };
  } catch (error) {
    throw error;
  }
};

// Get admin profile
const getProfile = async (adminId) => {
  try {
    const admin = await Admin.findById(adminId).select("-password");
    if (!admin) {
      throw new Error("Admin not found");
    }
    return admin;
  } catch (error) {
    throw error;
  }
};

// Get dashboard statistics
const getDashboardStats = async () => {
  const stats = {
    users: 0,
    products: 0,
    orders: 0,
    revenue: 0,
    status: {
      userService: "unknown",
      productService: "unknown",
      orderService: "unknown",
    },
  };

  // Get users count
  try {
    const userResponse = await axios.get(
      `${process.env.USER_SERVICE_URL}/api/users/count`,
      {
        timeout: 5000,
      }
    );
    stats.users = userResponse.data.count || 0;
    stats.status.userService = "available";
  } catch (error) {
    console.log("User service unavailable:", error.message);
    stats.status.userService = "unavailable";
  }

  // Get products count
  try {
    const productResponse = await axios.get(
      `${process.env.PRODUCT_SERVICE_URL}/api/products/count`,
      {
        timeout: 5000,
      }
    );
    stats.products = productResponse.data.count || 0;
    stats.status.productService = "available";
  } catch (error) {
    console.log("Product service unavailable:", error.message);
    stats.status.productService = "unavailable";
  }

  // Get orders stats
  try {
    const orderResponse = await axios.get(
      `${process.env.ORDER_SERVICE_URL}/api/orders/stats`,
      {
        timeout: 5000,
      }
    );
    if (orderResponse.data.success) {
      stats.orders = orderResponse.data.data.totalOrders || 0;
      stats.revenue = orderResponse.data.data.totalRevenue || 0;
    }
    stats.status.orderService = "available";
  } catch (error) {
    console.log("Order service unavailable:", error.message);
    stats.status.orderService = "unavailable";
  }

  return stats;
};

// Get all users from user service
const getAllUsers = async (page = 1, limit = 10, search = "") => {
  try {
    const response = await axios.get(
      `${process.env.USER_SERVICE_URL}/api/users`,
      {
        params: { page, limit, search },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      throw new Error("User service is unavailable");
    }
    throw new Error(error.response?.data?.message || "Failed to fetch users");
  }
};

// Get all products from product service
const getAllProducts = async (
  page = 1,
  limit = 10,
  search = "",
  category = ""
) => {
  try {
    const response = await axios.get(
      `${process.env.PRODUCT_SERVICE_URL}/api/products`,
      {
        params: { page, limit, search, category },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      throw new Error("Product service is unavailable");
    }
    throw new Error(
      error.response?.data?.message || "Failed to fetch products"
    );
  }
};

// Get all orders from order service
const getAllOrders = async (page = 1, limit = 10, status = "") => {
  try {
    const response = await axios.get(
      `${process.env.ORDER_SERVICE_URL}/api/orders`,
      {
        params: { page, limit, status },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      throw new Error("Order service is unavailable");
    }
    throw new Error(error.response?.data?.message || "Failed to fetch orders");
  }
};

// Update order status
const updateOrderStatus = async (orderId, status) => {
  try {
    const response = await axios.put(
      `${process.env.ORDER_SERVICE_URL}/api/orders/${orderId}/status`,
      { status },
      { timeout: 10000 }
    );
    return response.data;
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      throw new Error("Order service is unavailable");
    }
    throw new Error(
      error.response?.data?.message || "Failed to update order status"
    );
  }
};

// Update user status
const updateUserStatus = async (userId, status) => {
  try {
    const response = await axios.put(
      `${process.env.USER_SERVICE_URL}/api/users/${userId}/status`,
      { status },
      { timeout: 10000 }
    );
    return response.data;
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      throw new Error("User service is unavailable");
    }
    throw new Error(
      error.response?.data?.message || "Failed to update user status"
    );
  }
};

module.exports = {
  login,
  getProfile,
  getDashboardStats,
  getAllUsers,
  getAllProducts,
  getAllOrders,
  updateOrderStatus,
  updateUserStatus,
};
