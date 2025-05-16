const User = require("../../models/User");
const Admin = require("../../models/Admin");
const Event = require("../../models/Event");
const Payment = require("../../models/Payment");
const RefundRequest = require("../../models/RefundRequest");
const bcrypt = require("bcryptjs");

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrganizers = await User.countDocuments({ role: "organizer" });
    const totalEvents = await Event.countDocuments();
    const totalRevenue =
      (
        await Payment.aggregate([
          { $match: { status: "completed" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ])
      )[0]?.total || 0;
    const pendingEvents = await Event.countDocuments({
      event_status: "pending",
    });
    const activeRefundRequests = await RefundRequest.countDocuments({
      status: "pending",
    });

    const monthlySales = await Payment.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          sales: { $sum: 1 },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const newUserGrowth = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalUsers,
      totalOrganizers,
      totalEvents,
      totalRevenue,
      pendingEvents,
      activeRefundRequests,
      charts: { monthlySales, newUserGrowth },
    });
  } catch (err) {
    // console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Server error in dashboard stats" });
  }
};

// Platform settings in database
// We should move from in-memory settings to database-stored settings
exports.getSettings = async (req, res) => {
  try {
    // Get the admin user from the request (set by auth middleware)
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Not authorized as admin" });
    }

    // Find the admin profile
    const adminProfile = await Admin.findOne({ user: adminUser._id });

    // Get global platform settings
    // This could be from a dedicated Settings model in a real app
    // For now, we'll use a dummy settings object
    const settings = {
      commission: 0.1, // 10%
      taxRate: 0.07, // 7%
      notificationPreferences: {
        email: adminProfile?.emailNotifications?.systemAlerts || true,
        sms: false,
      },
      branding: {
        logo: "/logo.png",
        theme: "default",
        primaryColor: "#3B82F6",
        secondaryColor: "#1E40AF",
      },
    };

    res.json(settings);
  } catch (err) {
    // console.error("Get settings error:", err);
    res.status(500).json({ error: "Server error while retrieving settings" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    // Get the admin user from the request (set by auth middleware)
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ error: "Not authorized as admin" });
    }

    const { commission, taxRate, notificationPreferences, branding } = req.body;

    // Find the admin profile and update notification preferences
    const adminProfile = await Admin.findOne({ user: adminUser._id });
    if (adminProfile && notificationPreferences) {
      adminProfile.emailNotifications = {
        ...adminProfile.emailNotifications,
        systemAlerts: notificationPreferences.email,
      };
      await adminProfile.save();
    }

    // In a real application, you would update the settings in a database
    // For this example, we'll just return the received settings
    const updatedSettings = {
      commission: commission !== undefined ? commission : 0.1,
      taxRate: taxRate !== undefined ? taxRate : 0.07,
      notificationPreferences: notificationPreferences || {
        email: true,
        sms: false,
      },
      branding: branding || {
        logo: "/logo.png",
        theme: "default",
        primaryColor: "#3B82F6",
        secondaryColor: "#1E40AF",
      },
    };

    res.json(updatedSettings);
  } catch (err) {
    // console.error("Update settings error:", err);
    res.status(500).json({ error: "Server error while updating settings" });
  }
};

exports.changeAdminPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Extract userId from the JWT token (set by auth middleware)
    const userId = req.user.id;
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user is an admin
    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Unauthorized: User is not an admin" });
    }

    // Check if the old password matches
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Old password is incorrect" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    // Update the last login timestamp in the admin profile
    const adminProfile = await Admin.findOne({ user: userId });
    if (adminProfile) {
      adminProfile.lastLogin = Date.now();
      await adminProfile.save();
    }

    res.json({ message: "Admin password changed successfully" });
  } catch (err) {
    // console.error("Change password error:", err);
    res.status(500).json({ error: "Server error while changing password" });
  }
};

// Create or update an admin profile
exports.updateAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone, position, department, permissions, emailNotifications } =
      req.body;

    // Check if user exists and is an admin
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ error: "User is not an admin" });
    }

    // Find existing admin profile or create new one
    let adminProfile = await Admin.findOne({ user: userId });

    if (adminProfile) {
      // Update existing profile
      if (phone !== undefined) adminProfile.phone = phone;
      if (position !== undefined) adminProfile.position = position;
      if (department !== undefined) adminProfile.department = department;
      if (permissions !== undefined)
        adminProfile.permissions = {
          ...adminProfile.permissions,
          ...permissions,
        };
      if (emailNotifications !== undefined)
        adminProfile.emailNotifications = {
          ...adminProfile.emailNotifications,
          ...emailNotifications,
        };

      await adminProfile.save();
    } else {
      // Create new admin profile
      adminProfile = new Admin({
        user: userId,
        phone: phone || "",
        position: position || "System Administrator",
        department: department || "IT",
        permissions: permissions || {
          manageUsers: true,
          manageEvents: true,
          managePayments: true,
          manageRefunds: true,
          managePlatformSettings: true,
        },
        emailNotifications: emailNotifications || {
          newUsers: true,
          newEvents: true,
          refundRequests: true,
          systemAlerts: true,
        },
      });

      await adminProfile.save();
    }

    res.json({
      message: "Admin profile updated successfully",
      adminProfile,
    });
  } catch (err) {
    // console.error("Update admin profile error:", err);
    res
      .status(500)
      .json({ error: "Server error while updating admin profile" });
  }
};

// Get admin profile
exports.getAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user exists and is an admin
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ error: "User is not an admin" });
    }

    // Find admin profile
    const adminProfile = await Admin.findOne({ user: userId });
    if (!adminProfile) {
      return res.status(404).json({ error: "Admin profile not found" });
    }

    res.json(adminProfile);
  } catch (err) {
    // console.error("Get admin profile error:", err);
    res.status(500).json({ error: "Server error while getting admin profile" });
  }
};
