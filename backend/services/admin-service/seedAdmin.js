const mongoose = require("mongoose");
const Admin = require("./models/Admin");
require("dotenv").config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: "admin@example.com" });

    if (existingAdmin) {
      console.log("❌ Admin user already exists");
      console.log("📧 Email: admin@example.com");
      console.log("🔑 Password: admin123");
      process.exit(0);
    }

    // Create admin user
    const admin = new Admin({
      username: "admin",
      email: "admin@example.com",
      password: "admin123", // This will be hashed automatically
      role: "super_admin",
      status: "active",
    });

    await admin.save();

    console.log("✅ Admin user created successfully!");
    console.log("📧 Email: admin@example.com");
    console.log("🔑 Password: admin123");
    console.log("🔐 Role: super_admin");
    console.log("");
    console.log("🚀 You can now start the server with: npm run dev");
    console.log("📊 Login at: http://localhost:5006/api/admin/login");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
    process.exit(1);
  }
};

// Run the seed function
createAdmin();
