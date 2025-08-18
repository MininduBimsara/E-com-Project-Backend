// backend/services/user-service/Services/authService.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const UserRepository = require("../Repository/UserRepository");
const AuthRepository = require("../Repository/AuthRepository");

const registerUser = async (userData, profileImageFilename = null) => {
  const { username, email, password, role } = userData;

  if (!username || !email || !password) {
    throw new Error("All fields are required");
  }

  const existingUser = await UserRepository.findByEmail(email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user in User DB
  let user;
  try {
    user = await UserRepository.create({
      username,
      email,
      password: hashedPassword,
      role: role || "customer",
      profileImage: profileImageFilename,
    });

    console.log("✅ [authService.registerUser] User created:", {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error(
      "❌ [authService.registerUser] Failed to create user:",
      error.message
    );
    throw new Error("Failed to create user account");
  }

  // If this is an admin, also create record in Admin Service
  if (user.role === "admin") {
    try {
      const adminServiceUrl =
        process.env.ADMIN_SERVICE_URL || "http://localhost:4006";
      const adminEndpoint = `${adminServiceUrl}/api/admin/register`;

      console.log(
        "🔄 [authService.registerUser] Creating admin record at:",
        adminEndpoint
      );

      const adminPayload = {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        password: password, // Send plain password for Admin Service to hash
      };

      console.log("📤 [authService.registerUser] Admin payload:", {
        userId: adminPayload.userId,
        username: adminPayload.username,
        email: adminPayload.email,
        password: "[REDACTED]",
      });

      const adminResponse = await axios.post(adminEndpoint, adminPayload, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "User-Service/1.0",
        },
        timeout: 10000, // 10 second timeout
      });

      console.log(
        "✅ [authService.registerUser] Admin record created successfully:",
        {
          status: adminResponse.status,
          message: adminResponse.data?.message,
        }
      );
    } catch (error) {
      console.error(
        "❌ [authService.registerUser] Failed to create admin in Admin Service:",
        {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          code: error.code,
        }
      );

      // Rollback user creation if admin creation fails
      try {
        await UserRepository.deleteById(user._id);
        console.log("🔄 [authService.registerUser] User rollback completed");
      } catch (rollbackError) {
        console.error(
          "💥 [authService.registerUser] Rollback failed:",
          rollbackError.message
        );
      }

      // Provide specific error messages based on the type of failure
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new Error(
          "Admin service is unavailable. Please try again later."
        );
      } else if (error.response?.status === 400) {
        throw new Error(
          `Admin creation failed: ${
            error.response.data?.message || "Invalid data"
          }`
        );
      } else if (error.response?.status === 500) {
        throw new Error(
          "Admin service encountered an error. Please try again."
        );
      } else {
        throw new Error("Failed to create admin record. Please try again.");
      }
    }
  }

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

  console.log("🔐 [authService.loginUser] User found:", {
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
    "🔄 [authService.generateUserResponse] Generated response:",
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
    "📝 [authService.formatUserResponse] Formatted user:",
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
