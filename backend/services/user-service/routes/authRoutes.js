const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

// File upload middleware (optional if profileImage used)
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

router.post(
  "/register",
  upload.single("profileImage"),
  authController.register
);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/verify", protect, authController.verifyToken);
router.put("/change-password", protect, authController.changePassword);

module.exports = router;
