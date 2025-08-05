const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const productController = require("../controllers/productController");
const { verifyAuth, optionalAuth } = require("../middlewares/authMiddleware");

// Ensure upload directory exists
const uploadPath = path.join(__dirname, "../public/product-images");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

const uploadAny = upload.any();

// ---------- ROUTES ---------- //

// Health/Test Route
router.get("/test", (req, res) => {
  res.json({ message: "Product routes working" });
});

// Public routes
router.get("/public", productController.getPublicProducts);
router.get("/featured", productController.getFeaturedProducts);
router.get("/search", productController.searchProducts);

// Category route
router.get("/category/:category", productController.getProductsByCategory);

// Authenticated user routes
router.get("/my", verifyAuth, productController.getUserProducts);

// CRUD operations
router.post(
  "/",
  verifyAuth,
  uploadAny,
  (req, res, next) => {
    // Extract the file regardless of field name
    const uploadedFile =
      req.files && req.files.length > 0 ? req.files[0] : null;
    req.file = uploadedFile; // Normalize to req.file for controller
    next();
  },
  productController.createProduct
);

router.put(
  "/:id",
  verifyAuth,
  upload.single("productImage"),
  productController.updateProduct
);

router.patch("/:id/stock", verifyAuth, productController.updateProductStock);
router.delete("/:id", verifyAuth, productController.deleteProduct);

// Main product list (optional auth)
router.get("/", optionalAuth, productController.getProducts);

// Get product by ID (should be last to prevent conflicts)
router.get("/details/:id", optionalAuth, productController.getProductById);

// Serve static product images with CORS headers
router.use(
  "/product-images",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  },
  express.static(path.join(__dirname, "../public/product-images"))
);

// ---------- ERROR HANDLING ---------- //
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large. Max 5MB." });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "Unexpected file field." });
    }
  }

  if (error.message?.includes("Only image files are allowed")) {
    return res.status(400).json({ message: error.message });
  }

  next(error);
});

module.exports = router;
