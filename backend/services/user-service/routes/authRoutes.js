const express = require("express");
const {
  register,
  login,
  verifyToken,
  logout,
  syncFirebasePassword,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const multer = require("multer");
const path = require("path");
const router = express.Router();

// Set up multer for profile image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/profile-images/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExt = path.extname(file.originalname);
    cb(null, "profile-" + uniqueSuffix + fileExt);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."), false);
  }
};

const upload = multer({ storage, fileFilter });

// Auth routes
router.post("/register", upload.single("profileImage"), register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/verify", protect, verifyToken);

module.exports = router;
