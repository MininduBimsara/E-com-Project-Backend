const User = require("../models/User");

const updatePassword = async (userId, hashedPassword) => {
  return await User.findByIdAndUpdate(
    userId,
    { password: hashedPassword },
    { new: true }
  );
};

/**
 * Find user by Google ID
 * @param {String} googleId - Google ID
 * @returns {Object|null} User document or null
 */
const findByGoogleId = async (googleId) => {
  return await User.findOne({ googleId });
};

/**
 * Create user from Google auth
 * @param {Object} googleUserData - Google user data
 * @returns {Object} Created user document
 */
const createGoogleUser = async (googleUserData) => {
  const user = new User(googleUserData);
  return await user.save();
};

/**
 * Update existing Google user
 * @param {String} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object|null} Updated user document
 */
const updateGoogleUser = async (userId, updateData) => {
  return await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });
};

module.exports = {
  updatePassword,
  findByGoogleId,
  createGoogleUser,
  updateGoogleUser,
};
