const { OAuth2Client } = require("google-auth-library");
const AuthRepository = require("../Repository/AuthRepository");
const jwt = require("jsonwebtoken");

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Verify a Google token ID
const verifyGoogleToken = async (token) => {
  try {
    // Verify the token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // Extract user details from payload
    const { sub: googleId, name, email, picture } = payload;

    // Find or create the user using repository
    let user = await AuthRepository.findByGoogleId(googleId);

    if (!user) {
      // Create new user if not found
      const googleUserData = {
        name,
        email,
        username: email.split("@")[0],
        googleId,
        emailVerified: true,
        profileImage: picture || null,
        password: null, // Google users don't need password
      };
      user = await AuthRepository.createGoogleUser(googleUserData);
    } else {
      // Update existing user info if needed
      const updateData = {
        name: name || user.name,
        email,
        profileImage: picture || user.profileImage,
      };
      user = await AuthRepository.updateGoogleUser(user._id, updateData);
    }

    // Generate JWT token
    const authToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        auth: "google",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    if (!authToken) {
      throw new Error("Failed to generate JWT token");
    }

    // Return user data and token
    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        profileImage: user.profileImage,
        googleId: user.googleId,
        emailVerified: user.emailVerified,
      },
      token: authToken,
    };
  } catch (error) {
    console.error("Google auth verification error:", error);
    throw new Error("Failed to verify Google token");
  }
};

module.exports = {
  verifyGoogleToken,
};
