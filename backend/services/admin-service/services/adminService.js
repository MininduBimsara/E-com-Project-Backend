// backend/services/admin-service/services/adminService.js
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Create admin record with enhanced error handling
const createAdmin = async (adminData) => {
  try {
    console.log("🔄 [adminService.createAdmin] Creating admin with data:", {
      ...adminData,
      password: "[REDACTED]",
    });

    // Check if admin already exists by email
    const existingAdmin = await Admin.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log(
        "⚠️ [adminService.createAdmin] Admin already exists:",
        adminData.email
      );
      return existingAdmin;
    }

    // Create new admin
    const admin = new Admin(adminData);
    await admin.save();

    console.log("✅ [adminService.createAdmin] Admin created successfully:", {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    });

    return admin;
  } catch (error) {
    console.error("💥 [adminService.createAdmin] Error creating admin:", {
      message: error.message,
      name: error.name,
      code: error.code,
      keyPattern: error.keyPattern,
    });
    throw error;
  }
};

// Find admin by email
const findByEmail = async (email) => {
  try {
    const admin = await Admin.findOne({ email });
    console.log(
      "🔍 [adminService.findByEmail] Search result for",
      email,
      ":",
      !!admin
    );
    return admin;
  } catch (error) {
    console.error("❌ [adminService.findByEmail] Error:", error);
    throw error;
  }
};

// Login admin
const login = async (email, password) => {
  try {
    console.log("🔐 [adminService.login] Login attempt for:", email);

    // Find admin by email
    const admin = await Admin.findOne({ email });

    if (!admin) {
      console.log("❌ [adminService.login] Admin not found:", email);
      throw new Error("Invalid credentials");
    }

    // Check if admin is active
    if (admin.status !== "active") {
      console.log("❌ [adminService.login] Admin account inactive:", email);
      throw new Error("Admin account is inactive");
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      console.log("❌ [adminService.login] Invalid password for:", email);
      throw new Error("Invalid credentials");
    }

    // Update last login
    await admin.updateLastLogin();

    console.log("✅ [adminService.login] Login successful for:", email);

    // Generate token
    const token = generateToken(admin._id);

    return {
      admin: {
        id: admin._id,
        _id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        status: admin.status,
        lastLoginAt: admin.lastLoginAt,
      },
      token,
    };
  } catch (error) {
    console.error("❌ [adminService.login] Login service error:", error);
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

    return {
      id: admin._id,
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
    };
  } catch (error) {
    console.error("Get profile service error:", error);
    throw error;
  }
};

// Helper function to make service calls with proper error handling
const makeServiceCall = async (url, serviceName, timeout = 5000) => {
  try {
    console.log(`🔗 Calling ${serviceName}: ${url}`);

    const response = await axios.get(url, {
      timeout,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Admin-Service/1.0",
      },
    });

    console.log(`✅ ${serviceName} responded:`, response.status);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ ${serviceName} error:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: url,
    });

    return {
      success: false,
      error: error.message,
      code: error.code,
      status: error.response?.status,
    };
  }
};

// Get dashboard statistics with detailed logging
const getDashboardStats = async () => {
  console.log("📊 Fetching dashboard statistics...");

  const stats = {
    users: 0,
    products: 0,
    orders: 0,
    revenue: 0,
    payments: 0,
    cartItems: 0,
    status: {
      userService: "checking",
      productService: "checking",
      orderService: "checking",
      cartService: "checking",
      paymentService: "checking",
    },
  };

  // Service URLs with fallbacks
  const userServiceUrl =
    process.env.USER_SERVICE_URL || "http://localhost:4000";
  const productServiceUrl =
    process.env.PRODUCT_SERVICE_URL || "http://localhost:4001";
  const cartServiceUrl =
    process.env.CART_SERVICE_URL || "http://localhost:4002";
  const orderServiceUrl =
    process.env.ORDER_SERVICE_URL || "http://localhost:4003";
  const paymentServiceUrl =
    process.env.PAYMENT_SERVICE_URL || "http://localhost:4004";

  console.log("🔗 Service URLs:", {
    userService: userServiceUrl,
    productService: productServiceUrl,
    cartService: cartServiceUrl,
    orderService: orderServiceUrl,
    paymentService: paymentServiceUrl,
  });

  // Get users count
  const userService = await makeServiceCall(
    `${userServiceUrl}/api/users/count`,
    "User Service"
  );

  if (userService.success) {
    stats.users = userService.data.count || userService.data.data?.count || 0;
    stats.status.userService = "available";
  } else {
    stats.status.userService = "unavailable";
    console.log(`⚠️ User service unavailable: ${userService.error}`);
  }

  // Get products count
  const productService = await makeServiceCall(
    `${productServiceUrl}/api/products/count`,
    "Product Service"
  );

  if (productService.success) {
    stats.products =
      productService.data.count || productService.data.data?.count || 0;
    stats.status.productService = "available";
  } else {
    stats.status.productService = "unavailable";
    console.log(`⚠️ Product service unavailable: ${productService.error}`);
  }

  // Get cart items count
  const cartService = await makeServiceCall(
    `${cartServiceUrl}/api/cart/stats`,
    "Cart Service"
  );

  if (cartService.success) {
    const cartData = cartService.data.data || cartService.data;
    stats.cartItems = cartData.totalItems || cartData.totalCartItems || 0;
    stats.status.cartService = "available";
  } else {
    stats.status.cartService = "unavailable";
    console.log(`⚠️ Cart service unavailable: ${cartService.error}`);
  }

  // Get orders stats
  const orderService = await makeServiceCall(
    `${orderServiceUrl}/api/orders/stats`,
    "Order Service"
  );

  if (orderService.success) {
    const orderData = orderService.data.data || orderService.data;
    stats.orders = orderData.totalOrders || 0;
    stats.revenue = orderData.totalRevenue || 0;
    stats.status.orderService = "available";
  } else {
    stats.status.orderService = "unavailable";
    console.log(`⚠️ Order service unavailable: ${orderService.error}`);
  }

  // Get payment stats
  const paymentService = await makeServiceCall(
    `${paymentServiceUrl}/api/payments/stats`,
    "Payment Service"
  );

  if (paymentService.success) {
    const paymentData = paymentService.data.data || paymentService.data;
    stats.payments =
      paymentData.totalPayments || paymentData.completedPayments || 0;
    stats.status.paymentService = "available";
  } else {
    stats.status.paymentService = "unavailable";
    console.log(`⚠️ Payment service unavailable: ${paymentService.error}`);
  }

  console.log("📈 Final stats:", stats);
  return stats;
};

// Get all users with service availability check
const getAllUsers = async (page = 1, limit = 10, search = "") => {
  const userServiceUrl =
    process.env.USER_SERVICE_URL || "http://localhost:4000";

  try {
    console.log(`👥 Fetching users: ${userServiceUrl}/api/users`);

    const response = await axios.get(`${userServiceUrl}/api/users`, {
      params: { page, limit, search },
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Admin-Service/1.0",
      },
    });

    console.log(`✅ Users response status: ${response.status}`);

    // Handle different response formats
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else if (response.data.data) {
      return response.data.data;
    } else if (Array.isArray(response.data)) {
      return {
        data: response.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: response.data.length,
          pages: Math.ceil(response.data.length / limit),
        },
      };
    } else {
      // Return empty data structure if service has no users
      return {
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      };
    }
  } catch (error) {
    console.error("❌ Get users service error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: `${userServiceUrl}/api/users`,
    });

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      throw new Error(
        "User service is unavailable. Please start the user service on port 4000."
      );
    }

    throw new Error(`Failed to fetch users: ${error.message}`);
  }
};

// Get all products with service availability check
const getAllProducts = async (
  page = 1,
  limit = 10,
  search = "",
  category = ""
) => {
  const productServiceUrl =
    process.env.PRODUCT_SERVICE_URL || "http://localhost:4001";

  try {
    console.log(`📦 Fetching products: ${productServiceUrl}/api/products`);

    const response = await axios.get(`${productServiceUrl}/api/products`, {
      params: { page, limit, search, category },
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Admin-Service/1.0",
      },
    });

    console.log(`✅ Products response status: ${response.status}`);

    // Handle different response formats
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else if (response.data.data) {
      return response.data.data;
    } else if (Array.isArray(response.data)) {
      return {
        data: response.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: response.data.length,
          pages: Math.ceil(response.data.length / limit),
        },
      };
    } else {
      return {
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      };
    }
  } catch (error) {
    console.error("❌ Get products service error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: `${productServiceUrl}/api/products`,
    });

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      throw new Error(
        "Product service is unavailable. Please start the product service on port 4001."
      );
    }

    throw new Error(`Failed to fetch products: ${error.message}`);
  }
};

// Get all orders with service availability check
const getAllOrders = async (page = 1, limit = 10, status = "") => {
  const orderServiceUrl =
    process.env.ORDER_SERVICE_URL || "http://localhost:4003";

  try {
    console.log(`🛒 Fetching orders: ${orderServiceUrl}/api/orders`);

    const response = await axios.get(`${orderServiceUrl}/api/orders`, {
      params: { page, limit, status },
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Admin-Service/1.0",
      },
    });

    console.log(`✅ Orders response status: ${response.status}`);

    // Handle different response formats
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else if (response.data.data) {
      return response.data.data;
    } else if (Array.isArray(response.data)) {
      return {
        data: response.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: response.data.length,
          pages: Math.ceil(response.data.length / limit),
        },
      };
    } else {
      return {
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      };
    }
  } catch (error) {
    console.error("❌ Get orders service error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: `${orderServiceUrl}/api/orders`,
    });

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      throw new Error(
        "Order service is unavailable. Please start the order service on port 4003."
      );
    }

    throw new Error(`Failed to fetch orders: ${error.message}`);
  }
};

// Update order status
const updateOrderStatus = async (orderId, status) => {
  const orderServiceUrl =
    process.env.ORDER_SERVICE_URL || "http://localhost:4003";

  try {
    const response = await axios.put(
      `${orderServiceUrl}/api/orders/${orderId}/status`,
      { status },
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Admin-Service/1.0",
        },
      }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    } else if (response.data.data) {
      return response.data.data;
    } else {
      return response.data;
    }
  } catch (error) {
    console.error("❌ Update order status error:", error);
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      throw new Error("Order service is unavailable");
    }
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to update order status"
    );
  }
};

// Update user status
const updateUserStatus = async (userId, status) => {
  const userServiceUrl =
    process.env.USER_SERVICE_URL || "http://localhost:4000";

  try {
    const response = await axios.put(
      `${userServiceUrl}/api/users/${userId}/status`,
      { status },
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Admin-Service/1.0",
        },
      }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    } else if (response.data.data) {
      return response.data.data;
    } else {
      return response.data;
    }
  } catch (error) {
    console.error("❌ Update user status error:", error);
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      throw new Error("User service is unavailable");
    }
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to update user status"
    );
  }
};

module.exports = {
  createAdmin,
  findByEmail,
  login,
  getProfile,
  getDashboardStats,
  getAllUsers,
  getAllProducts,
  getAllOrders,
  updateOrderStatus,
  updateUserStatus,
};
