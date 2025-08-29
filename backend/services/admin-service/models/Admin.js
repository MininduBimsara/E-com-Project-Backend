const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, "User ID is required"],
    unique: true,
  },
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
    minlength: [3, "Username must be at least 3 characters"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please enter a valid email",
    ],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
  },
  role: {
    type: String,
    default: "admin",
    enum: ["admin", "super_admin"],
  },
  status: {
    type: String,
    default: "active",
    enum: ["active", "inactive"],
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    console.log("🔐 [Admin.pre('save')] Hashing password for:", this.email);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log("✅ [Admin.pre('save')] Password hashed successfully");
    next();
  } catch (error) {
    console.error("❌ [Admin.pre('save')] Password hashing failed:", error);
    next(error);
  }
});

// Compare password method
adminSchema.methods.comparePassword = async function (password) {
  try {
    console.log(
      "🔍 [Admin.comparePassword] Comparing password for:",
      this.email
    );
    const isMatch = await bcrypt.compare(password, this.password);
    console.log("🔍 [Admin.comparePassword] Password match:", isMatch);
    return isMatch;
  } catch (error) {
    console.error("❌ [Admin.comparePassword] Error:", error);
    return false;
  }
};

// Update last login
adminSchema.methods.updateLastLogin = function () {
  console.log(
    "📅 [Admin.updateLastLogin] Updating last login for:",
    this.email
  );
  this.lastLoginAt = new Date();
  return this.save();
};

// Remove password from JSON output
adminSchema.methods.toJSON = function () {
  const adminObject = this.toObject();
  delete adminObject.password;
  return adminObject;
};

// Add index for better performance
adminSchema.index({ email: 1 });
adminSchema.index({ userId: 1 });
adminSchema.index({ username: 1 });

module.exports = mongoose.model("Admin", adminSchema);
