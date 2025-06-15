const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const productController = require("../controllers/productController");
const { verifyAuth, optionalAuth } = require("../middleware/authMiddleware");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../public/product-images");

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Public routes (no authentication required)
router.get("/public", productController.getPublicProducts);
router.get("/featured", productController.getFeaturedProducts);
router.get("/search", productController.searchProducts);
router.get("/category/:category", productController.getProductsByCategory);

// Routes with optional authentication
router.get("/", optionalAuth, productController.getProducts);

// Protected routes (authentication required)
router.post(
  "/",
  verifyAuth,
  upload.single("productImage"),
  productController.createProduct
);
router.get("/my-products", verifyAuth, productController.getUserProducts);
router.get("/low-stock", verifyAuth, productController.getLowStockProducts);
router.get("/stats", verifyAuth, productController.getProductStats);
router.get("/:id", verifyAuth, productController.getProductById);
router.put(
  "/:id",
  verifyAuth,
  upload.single("productImage"),
  productController.updateProduct
);
router.delete("/:id", verifyAuth, productController.deleteProduct);
router.patch("/:id/stock", verifyAuth, productController.updateProductStock);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File too large. Maximum size allowed is 5MB.",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "Unexpected field. Only 'productImage' field is allowed.",
      });
    }
  }

  if (error.message.includes("Only image files are allowed")) {
    return res.status(400).json({
      message: error.message,
    });
  }

  next(error);
});

module.exports = router;
