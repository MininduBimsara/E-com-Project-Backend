const User = require("../../models/User");
const Organizer = require("../../models/Organizer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

// Registration handler
const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const profileImageData = req.file ? req.file.filename : null;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({
      username,
      email,
      password: hashedPassword,
      role,
      profileImage: profileImageData,
    });

    await user.save();

    // Generate a token for newly registered user
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // If user is an organizer, create a basic organizer profile
    // with default values only (no additional fields from request)
    if (role === "organizer") {
      const organizer = new Organizer({
        user: user._id,
        // Default values only - no extra fields from the registration form
        phone: "",
        bio: "",
        website: "",
        instagram: "",
        facebook: "",
        linkedin: "",
        categories: [],
        isPublic: true,
      });
      await organizer.save();
    }

    // Generate token
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Use "lax" for development, "none" for production with secure:true
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id, // Add this line to include the MongoDB ID
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: profileImageData
          ? `/profile-images/${profileImageData}`
          : null,
      },
    });
  } catch (error) {
    // console.error("Registration error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Login handler
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Use "lax" for development, "none" for production with secure:true
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage
          ? `/profile-images/${user.profileImage}`
          : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify token handler
const verifyToken = async (req, res) => {
  try {
    // The protect middleware already verified the token
    // and attached the user to the request
    if (req.user) {
      return res.status(200).json({
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          profileImage: req.user.profileImage
            ? `/profile-images/${req.user.profileImage}`
            : null,
        },
      });
    }
    return res.status(401).json({ message: "Not authenticated" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Logout handler
const logout = (req, res) => {
  // Clear the cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  // Send a successful response
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

module.exports = {
  register,
  login,
  verifyToken,
  logout,
};
