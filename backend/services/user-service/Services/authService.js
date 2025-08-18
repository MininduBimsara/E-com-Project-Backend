// backend/services/user-service/Services/authService.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserRepository = require("../Repository/UserRepository");
const AuthRepository = require("../Repository/AuthRepository");

const registerUser = async (userData, profileImageFilename = null) => {
  const { username, email, password, role } = userData;

  // add role validation if needed || !role
  if (!username || !email || !password) {
    throw new Error("All fields are required");
  }

  const existingUser = await UserRepository.findByEmail(email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await UserRepository.create({
    username,
    email,
    password: hashedPassword,
    role: role || "customer", // Default to customer if no role provided
    profileImage: profileImageFilename,
  });

  const token = generateToken(user._id, user.role);

  return {
    token,
    user: formatUserResponse(user),
  };
};

const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const user = await UserRepository.findByEmail(email);
  if (!user) throw new Error("Invalid credentials");

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new Error("Invalid credentials");

  console.log("🔍 [authService.loginUser] User found:", {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  return generateUserResponse(user);
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await UserRepository.findById(userId);
  if (!user) throw new Error("User not found");

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new Error("Current password is incorrect");

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  await AuthRepository.updatePassword(userId, hashedNewPassword);

  return { message: "Password changed successfully" };
};

const updateUserProfile = async (userId, updateData) => {
  const updatedUser = await UserRepository.updateById(userId, updateData);
  if (!updatedUser) throw new Error("User not found");

  return formatUserResponse(updatedUser);
};

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

const generateUserResponse = (user) => {
  const userResponse = {
    token: generateToken(user._id, user.role),
    user: formatUserResponse(user),
  };

  console.log(
    "🔍 [authService.generateUserResponse] Generated response:",
    userResponse
  );
  return userResponse;
};

const formatUserResponse = (user) => {
  const formattedUser = {
    id: user._id,
    _id: user._id, // Keep both for compatibility
    username: user.username,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
  };

  console.log(
    "🔍 [authService.formatUserResponse] Formatted user:",
    formattedUser
  );
  return formattedUser;
};

const getUserData = (user) => formatUserResponse(user);

module.exports = {
  registerUser,
  loginUser,
  changePassword,
  updateUserProfile,
  generateToken,
  getUserData,
  formatUserResponse,
};
