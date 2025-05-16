const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const Event = require("../../models/Event");
const Organizer = require("../../models/Organizer");

// Get user profile (Only logged-in users can view their profile)
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    // req.user is already set by the protect middleware
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Return the user object (already excludes password because of the middleware)
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile (Only logged-in users can edit their own profile)
exports.updateUserProfile = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Extract fields from request body
    const updatedData = {};

    // Include profileImage if uploaded
    if (req.file) {
      updatedData.profileImage = req.file.filename;
    }

    // Only add fields that are provided in the request
    const allowedFields = [
      "name",
      "email",
      "firstName",
      "lastName",
      "phone",
      "address",
      "city",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updatedData[field] = req.body[field];
      }
    });

    // Handle username created from firstName and lastName
    if (req.body.username) {
      updatedData.name = req.body.username;
    }

    // Only handle password if provided
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updatedData.password = await bcrypt.hash(req.body.password, salt);
    }

    // Only update if there are fields to update
    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user profile (Only logged-in users can delete their own profile)
exports.deleteUserProfile = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Ensure the status is either "active" or "banned"
    if (!["active", "banned"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: `User status updated to ${status}`, user });
  } catch (error) {
    res.status(500).json({ message: "Error updating user status" });
  }
};

// get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Error fetching users" });
  }
};

