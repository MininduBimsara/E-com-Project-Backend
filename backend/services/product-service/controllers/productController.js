const productService = require("../Services/productService");

/**
 * Create a new product (requires authentication)
 */
const createProduct = async (req, res) => {
  try {
    const productImage = req.file ? req.file.filename : null;

    const product = await productService.createProduct(
      req.body,
      req.user,
      productImage
    );

    res.status(201).json({
      message: "Product created successfully!",
      product,
    });
  } catch (error) {
    const statusCode =
      error.message.includes("required fields") ||
      error.message.includes("Invalid category") ||
      error.message.includes("must be")
        ? 400
        : 500;

    res.status(statusCode).json({
      message: error.message,
    });
  }
};

/**
 * Get all public products (no authentication required)
 */
const getPublicProducts = async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      search: req.query.search,
      limit: req.query.limit || 50,
      skip: req.query.skip || 0,
    };

    const products = await productService.getPublicProducts(filters);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Get all products (with optional authentication)
 */
const getProducts = async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      search: req.query.search,
      limit: req.query.limit || 50,
      skip: req.query.skip || 0,
    };

    const products = await productService.getProducts(req.user, filters);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Get product by ID (requires authentication)
 */
const getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(
      req.params.id,
      req.user
    );
    res.status(200).json(product);
  } catch (error) {
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("Authentication required")
      ? 401
      : error.message.includes("not available")
      ? 403
      : 500;

    res.status(statusCode).json({
      message: error.message,
    });
  }
};

/**
 * Update a product (requires authentication)
 */
const updateProduct = async (req, res) => {
  try {
    const productImage = req.file ? req.file.filename : null;

    const updatedProduct = await productService.updateProduct(
      req.params.id,
      req.body,
      req.user,
      productImage
    );

    res.status(200).json({
      message: "Product updated successfully!",
      product: updatedProduct,
    });
  } catch (error) {
    const statusCode = error.message.includes("Access Denied")
      ? 403
      : error.message.includes("not found")
      ? 404
      : error.message.includes("Invalid") || error.message.includes("must be")
      ? 400
      : 500;

    res.status(statusCode).json({
      message: error.message,
    });
  }
};

/**
 * Delete a product (requires authentication)
 */
const deleteProduct = async (req, res) => {
  try {
    const result = await productService.deleteProduct(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.message.includes("Access Denied")
      ? 403
      : error.message.includes("not found")
      ? 404
      : 500;

    res.status(statusCode).json({
      message: error.message,
    });
  }
};

/**
 * Get products by category (public access)
 */
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const options = {
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0,
      sort: { createdAt: -1 },
      lean: true,
    };

    const products = await productService.getProductsByCategory(
      category,
      options
    );
    res.status(200).json(products);
  } catch (error) {
    const statusCode = error.message.includes("Invalid category") ? 400 : 500;
    res.status(statusCode).json({
      message: error.message,
    });
  }
};

/**
 * Search products (public access)
 */
const searchProducts = async (req, res) => {
  try {
    const { q: searchQuery } = req.query;
    const filters = {
      category: req.query.category,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      limit: req.query.limit || 50,
      skip: req.query.skip || 0,
    };

    const products = await productService.searchProducts(searchQuery, filters);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Get featured products (public access)
 */
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await productService.getFeaturedProducts(limit);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Get user's products (requires authentication)
 */
const getUserProducts = async (req, res) => {
  try {
    const products = await productService.getUserProducts(req.user.id);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * Update product stock (requires authentication)
 */
const updateProductStock = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        message: "Quantity is required",
      });
    }

    const updatedProduct = await productService.updateProductStock(
      req.params.id,
      parseInt(quantity),
      req.user
    );

    res.status(200).json({
      message: "Product stock updated successfully!",
      product: updatedProduct,
    });
  } catch (error) {
    const statusCode = error.message.includes("Access Denied")
      ? 403
      : error.message.includes("not found")
      ? 404
      : 500;

    res.status(statusCode).json({
      message: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getPublicProducts,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  searchProducts,
  getFeaturedProducts,
  getUserProducts,
  updateProductStock,
};
