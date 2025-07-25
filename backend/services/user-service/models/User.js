const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["customer", "organizer", "admin"],
    default: "customer",
  },
  profileImage: {
    type: String,
    // required: true,
  },
  status: {
    type: String,
    enum: ["active", "banned"],
    default: "active",
  },
  phone: {
    type: String,
  },
  address: {
    type: String,
  },
  city: {
    type: String,
  },
  googleId: {
    type: String, // Store the Google ID
    unique: true, // Ensure it's unique
    sparse: true, // Allow null values for non-Google users
  },
  emailVerified: {
    type: Boolean,
    default: false, // Default to false unless verified
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
