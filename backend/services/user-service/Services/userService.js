const bcrypt = require("bcryptjs");
const UserRepository = require("../Repository/UserRepository");

/**
 * Get a user profile by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User profile
 */
const getUserProfile = async (userId) => {
  const user = await UserRepository.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Remove password from response
  const { password, ...userProfile } = user.toObject();
  return userProfile;
};

/**
 * Update a user profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @param {File} profileImage - Optional profile image file
 * @returns {Promise<Object>} - Updated user profile
 */
const updateUserProfile = async (userId, updateData, profileImage = null) => {
  const updatedData = {};

  // Include profileImage if uploaded
  if (profileImage) {
    updatedData.profileImage = profileImage.filename;
  }

  // Only add fields that are provided in the request
  const allowedFields = [
    "username", // ← Use username instead
    "email",
    "phone",
    "address",
    "city",
  ];

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      updatedData[field] = updateData[field];
    }
  });

  // Handle username created from firstName and lastName
  // if (updateData.username) {
  //   updatedData.name = updateData.username;
  // }

  // Only handle password if provided
  if (updateData.password) {
    const salt = await bcrypt.genSalt(10);
    updatedData.password = await bcrypt.hash(updateData.password, salt);
  }

  // Only update if there are fields to update
  if (Object.keys(updatedData).length === 0) {
    throw new Error("No fields to update");
  }

  const updatedUser = await UserRepository.updateById(userId, updatedData);

  if (!updatedUser) {
    throw new Error("User not found");
  }

  // Remove password from response
  const { password, ...userProfile } = updatedUser.toObject();
  return userProfile;
};

/**
 * Delete a user profile
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Success message
 */
const deleteUserProfile = async (userId) => {
  const deletedUser = await UserRepository.deleteById(userId);
  if (!deletedUser) {
    throw new Error("User not found");
  }
  return { message: "User deleted successfully" };
};

/**
 * Update a user's status
 * @param {string} userId - User ID
 * @param {string} status - New status ('active' or 'banned')
 * @returns {Promise<Object>} - Updated user and success message
 */
const updateUserStatus = async (userId, status) => {
  // Ensure the status is either "active" or "banned"
  if (!["active", "banned"].includes(status)) {
    throw new Error("Invalid status value");
  }

  const user = await UserRepository.updateById(userId, { status });

  if (!user) {
    throw new Error("User not found");
  }

  return { message: `User status updated to ${status}`, user };
};

/**
 * Get all regular users
 * @returns {Promise<Array>} - List of regular users
 */
const getRegularUsers = async () => {
  return await UserRepository.findByRole("user");
};

/**
 * Get all non-admin users
 * @returns {Promise<Array>} - List of non-admin users
 */
const getAllNonAdminUsers = async () => {
  return await UserRepository.findAll({ role: { $ne: "admin" } });
};


module.exports = {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  updateUserStatus,
  getRegularUsers,
  getAllNonAdminUsers,
};
