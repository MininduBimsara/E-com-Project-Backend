const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Import repositories
const UserRepository = require("../../Repository/UserRepository");
const AuthRepository = require("../../Repository/AuthRepository");

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {String} profileImageFilename - Uploaded profile image filename (optional)
 * @returns {Object} User data and JWT token
 */
const registerUser = async (userData, profileImageFilename = null) => {
  const { username, email, password, role } = userData;

  if (!username || !email || !password || !role) {
    throw new Error("All fields are required");
  }

  // Check if user already exists using repository
  const existingUser = await UserRepository.findByEmail(email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user using repository
  const user = await UserRepository.create({
    username,
    email,
    password: hashedPassword,
    role,
    profileImage: profileImageFilename,
  });

  // Create organizer profile if role is organizer
  if (role === "organizer") {
    await createOrganizerProfile(user._id);
  }

  // Create admin profile if role is admin
  if (role === "admin") {
    await createAdminProfile(user._id);
  }

  // Generate JWT token
  const token = generateToken(user._id, user.role);

  return {
    token,
    user: formatUserResponse(user, profileImageFilename),
  };
};

/**
 * Authenticate a user
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Object} User data and JWT token
 */
const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Find user in database
  const user = await UserRepository.findByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // First, try to authenticate with database password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (isPasswordValid) {
    // Database authentication successful
    return generateUserResponse(user);
  }
};

/**
 * Change user password
 * @param {String} userId - User ID
 * @param {String} currentPassword - Current password
 * @param {String} newPassword - New password
 * @returns {Object} Success message
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await UserRepository.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // Update password using AuthRepository instead of UserRepository
  await AuthRepository.updatePassword(userId, hashedNewPassword);

  return { message: "Password changed successfully" };
};

/**
 * Generate JWT token
 * @param {String} userId - User ID
 * @param {String} role - User role
 * @returns {String} JWT token
 */
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role: role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};


/**
 * Update user profile
 * @param {String} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated user data
 */
const updateUserProfile = async (userId, updateData) => {
  const updatedUser = await UserRepository.updateById(userId, updateData);
  if (!updatedUser) {
    throw new Error("User not found");
  }

  return formatUserResponse(updatedUser);
};

module.exports = {
  registerUser,
  loginUser,
  getUserData,
  generateToken,
  formatUserResponse,
  updateUserProfile,
  changePassword,
};
