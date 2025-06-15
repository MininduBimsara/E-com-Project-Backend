const fs = require("fs");
const path = require("path");
const productRepository = require("../repositories/productRepository");

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @param {Object} user - Current user
 * @param {String} imageFilename - Uploaded image filename (optional)
 * @returns {Object} Created product
 */
const createProduct = async (productData, user, imageFilename = null) => {
  const {
    name,
    description,
    price,
    ecoRating,
    carbonFootprint,
    category,
    stock,
  } = productData;

  if (!name || !description || !price || !category) {
    throw new Error(
      "Missing required fields: name, description, price, and category are required."
    );
  }

  if (!["Kitchen", "Accessories", "Cloths"].includes(category)) {
    throw new Error(
      "Invalid category. Must be one of: Kitchen, Accessories, Cloths"
    );
  }

  if (price < 0) {
    throw new Error("Price must be a positive number.");
  }

  if (ecoRating && (ecoRating < 0 || ecoRating > 5)) {
    throw new Error("Eco rating must be between 0 and 5.");
  }

  if (carbonFootprint && carbonFootprint < 0) {
    throw new Error("Carbon footprint must be a positive number.");
  }

  if (stock && stock < 0) {
    throw new Error("Stock must be a positive number.");
  }

  const newProductData = {
    name: name.trim(),
    description: description.trim(),
    price: parseFloat(price),
    ecoRating: ecoRating ? parseFloat(ecoRating) : 0,
    carbonFootprint: carbonFootprint ? parseFloat(carbonFootprint) : 0,
    category,
    stock: stock ? parseInt(stock) : 0,
    imageUrl: imageFilename,
    createdBy: user.id,
  };

  const newProduct = await productRepository.create(newProductData);

  return {
    ...newProduct._doc,
    imageUrl: imageFilename ? `/product-images/${imageFilename}` : null,
  };
};

/**
 * Get all public products (no authentication required)
 * @param {Object} filters - Filter options
 * @returns {Array} List of products
 */
const getPublicProducts = async (filters = {}) => {
  const {
    category,
    minPrice,
    maxPrice,
    search,
    limit = 50,
    skip = 0,
  } = filters;

  let products;
  const options = {
    limit: parseInt(limit),
    skip: parseInt(skip),
    sort: { createdAt: -1 },
    lean: true,
  };

  if (search) {
    products = await productRepository.search(search, options);
  } else if (category && category !== "all") {
    products = await productRepository.findByCategory(category, options);
  } else if (minPrice || maxPrice) {
    const min = minPrice ? parseFloat(minPrice) : 0;
    const max = maxPrice ? parseFloat(maxPrice) : Number.MAX_VALUE;
    products = await productRepository.findByPriceRange(min, max, options);
  } else {
    products = await productRepository.findAll({}, options);
  }

  return products.map((product) => ({
    ...product,
    imageUrl: product.imageUrl ? `/product-images/${product.imageUrl}` : null,
  }));
};

/**
 * Get products based on user authentication
 * @param {Object} user - Current user (optional for public access)
 * @param {Object} filters - Filter options
 * @returns {Array} List of products
 */
const getProducts = async (user = null, filters = {}) => {
  if (!user) {
    // Return public products if no user
    return await getPublicProducts(filters);
  }

  // Authenticated users get all products
  return await getPublicProducts(filters);
};

/**
 * Get product by ID (requires authentication)
 * @param {String} productId - Product ID
 * @param {Object} user - Current user
 * @returns {Object} Product data
 */
const getProductById = async (productId, user) => {
  if (!user) {
    throw new Error("Authentication required to view product details");
  }

  const product = await productRepository.findById(productId);

  if (!product) {
    throw new Error("Product not found");
  }

  if (!product.isActive) {
    throw new Error("This product is no longer available");
  }

  return {
    ...product._doc,
    imageUrl: product.imageUrl ? `/product-images/${product.imageUrl}` : null,
  };
};

/**
 * Update a product
 * @param {String} productId - Product ID
 * @param {Object} updateData - Updated product data
 * @param {Object} user - Current user
 * @param {String} imageFilename - Uploaded image filename (optional)
 * @returns {Object} Updated product
 */
const updateProduct = async (
  productId,
  updateData,
  user,
  imageFilename = null
) => {
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new Error("Product not found");
  }

  if (product.createdBy !== user.id && user.role !== "admin") {
    throw new Error("Access Denied. You can only update your own products.");
  }

  // Validate update data
  const {
    name,
    description,
    price,
    ecoRating,
    carbonFootprint,
    category,
    stock,
  } = updateData;

  if (category && !["Kitchen", "Accessories", "Cloths"].includes(category)) {
    throw new Error(
      "Invalid category. Must be one of: Kitchen, Accessories, Cloths"
    );
  }

  if (price && price < 0) {
    throw new Error("Price must be a positive number.");
  }

  if (ecoRating && (ecoRating < 0 || ecoRating > 5)) {
    throw new Error("Eco rating must be between 0 and 5.");
  }

  if (carbonFootprint && carbonFootprint < 0) {
    throw new Error("Carbon footprint must be a positive number.");
  }

  if (stock && stock < 0) {
    throw new Error("Stock must be a positive number.");
  }

  // Create update data object
  const productUpdateData = {};

  if (name) productUpdateData.name = name.trim();
  if (description) productUpdateData.description = description.trim();
  if (price) productUpdateData.price = parseFloat(price);
  if (ecoRating !== undefined)
    productUpdateData.ecoRating = parseFloat(ecoRating);
  if (carbonFootprint !== undefined)
    productUpdateData.carbonFootprint = parseFloat(carbonFootprint);
  if (category) productUpdateData.category = category;
  if (stock !== undefined) productUpdateData.stock = parseInt(stock);

  // Add image if provided
  if (imageFilename) {
    productUpdateData.imageUrl = imageFilename;
  }

  productUpdateData.updatedAt = Date.now();

  const updatedProduct = await productRepository.updateById(
    productId,
    productUpdateData
  );

  return {
    ...updatedProduct._doc,
    imageUrl: updatedProduct.imageUrl
      ? `/product-images/${updatedProduct.imageUrl}`
      : null,
  };
};

/**
 * Delete a product
 * @param {String} productId - Product ID
 * @param {Object} user - Current user
 */
const deleteProduct = async (productId, user) => {
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new Error("Product not found");
  }

  if (product.createdBy !== user.id && user.role !== "admin") {
    throw new Error("Access Denied. You can only delete your own products.");
  }

  // Delete image file if exists
  if (product.imageUrl) {
    const filePath = path.join(
      __dirname,
      "../../public/product-images",
      product.imageUrl
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Soft delete the product
  await productRepository.deleteById(productId);
  return { message: "Product deleted successfully!" };
};

/**
 * Get products by category
 * @param {String} category - Product category
 * @param {Object} options - Query options
 * @returns {Array} List of products in category
 */
const getProductsByCategory = async (category, options = {}) => {
  if (!["Kitchen", "Accessories", "Cloths"].includes(category)) {
    throw new Error(
      "Invalid category. Must be one of: Kitchen, Accessories, Cloths"
    );
  }

  const products = await productRepository.findByCategory(category, {
    ...options,
    lean: true,
  });

  return products.map((product) => ({
    ...product,
    imageUrl: product.imageUrl ? `/product-images/${product.imageUrl}` : null,
  }));
};

/**
 * Search products
 * @param {String} searchQuery - Search query
 * @param {Object} filters - Additional filters
 * @returns {Array} List of matching products
 */
const searchProducts = async (searchQuery, filters = {}) => {
  const { category, minPrice, maxPrice, limit = 50, skip = 0 } = filters;

  let products;
  const options = {
    limit: parseInt(limit),
    skip: parseInt(skip),
    sort: { createdAt: -1 },
  };

  if (searchQuery) {
    products = await productRepository.search(searchQuery, options);
  } else {
    products = await productRepository.findAll({}, options);
  }

  // Apply additional filters
  if (category && category !== "all") {
    products = products.filter((product) => product.category === category);
  }

  if (minPrice || maxPrice) {
    const min = minPrice ? parseFloat(minPrice) : 0;
    const max = maxPrice ? parseFloat(maxPrice) : Number.MAX_VALUE;
    products = products.filter(
      (product) => product.price >= min && product.price <= max
    );
  }

  return products.map((product) => ({
    ...product._doc,
    imageUrl: product.imageUrl ? `/product-images/${product.imageUrl}` : null,
  }));
};

/**
 * Get featured products (high eco rating)
 * @param {Number} limit - Number of products to return
 * @returns {Array} List of featured products
 */
const getFeaturedProducts = async (limit = 10) => {
  const products = await productRepository.findFeatured(limit);

  return products.map((product) => ({
    ...product._doc,
    imageUrl: product.imageUrl ? `/product-images/${product.imageUrl}` : null,
  }));
};

/**
 * Get user's products
 * @param {String} userId - User ID
 * @returns {Array} List of user's products
 */
const getUserProducts = async (userId) => {
  const products = await productRepository.findByUserId(userId);

  return products.map((product) => ({
    ...product._doc,
    imageUrl: product.imageUrl ? `/product-images/${product.imageUrl}` : null,
  }));
};

/**
 * Update product stock
 * @param {String} productId - Product ID
 * @param {Number} quantity - Quantity to add/subtract
 * @param {Object} user - Current user
 * @returns {Object} Updated product
 */
const updateProductStock = async (productId, quantity, user) => {
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new Error("Product not found");
  }

  if (product.createdBy !== user.id && user.role !== "admin") {
    throw new Error("Access Denied. You can only update your own products.");
  }

  const updatedProduct = await productRepository.updateStock(
    productId,
    quantity
  );

  return {
    ...updatedProduct._doc,
    imageUrl: updatedProduct.imageUrl
      ? `/product-images/${updatedProduct.imageUrl}`
      : null,
  };
};
/**
 * Get products with low stock
 * @param {Number} threshold - Stock threshold (default: 10)
 * @returns {Array} List of products with low stock
 */
const getLowStockProducts = async (threshold = 10) => {
  const products = await productRepository.findLowStock(threshold);

  return products.map((product) => ({
    ...product._doc,
    imageUrl: product.imageUrl ? `/product-images/${product.imageUrl}` : null,
  }));
};

/**
 * Get product statistics for a user
 * @param {String} userId - User ID
 * @returns {Object} Product statistics
 */
const getProductStats = async (userId) => {
  const userProducts = await productRepository.findByUserId(userId);

  const stats = {
    totalProducts: userProducts.length,
    activeProducts: userProducts.filter((p) => p.isActive).length,
    inactiveProducts: userProducts.filter((p) => !p.isActive).length,
    totalStock: userProducts.reduce((sum, p) => sum + p.stock, 0),
    lowStockProducts: userProducts.filter((p) => p.stock <= 10).length,
    categories: {
      Kitchen: userProducts.filter((p) => p.category === "Kitchen").length,
      Accessories: userProducts.filter((p) => p.category === "Accessories")
        .length,
      Cloths: userProducts.filter((p) => p.category === "Cloths").length,
    },
    averagePrice:
      userProducts.length > 0
        ? userProducts.reduce((sum, p) => sum + p.price, 0) /
          userProducts.length
        : 0,
    averageEcoRating:
      userProducts.length > 0
        ? userProducts.reduce((sum, p) => sum + p.ecoRating, 0) /
          userProducts.length
        : 0,
    totalValue: userProducts.reduce((sum, p) => sum + p.price * p.stock, 0),
  };

  return stats;
};

/**
 * Get all products for admin (requires admin role)
 * @param {Object} user - Current user
 * @param {Object} filters - Filter options
 * @returns {Array} List of all products including inactive ones
 */
const getAllProductsForAdmin = async (user, filters = {}) => {
  if (user.role !== "admin") {
    throw new Error("Access denied. Admin privileges required.");
  }

  const {
    category,
    minPrice,
    maxPrice,
    search,
    includeInactive = false,
    limit = 50,
    skip = 0,
  } = filters;

  let products;
  const options = {
    limit: parseInt(limit),
    skip: parseInt(skip),
    sort: { createdAt: -1 },
    lean: true,
  };

  // Modify repository query to include inactive products if requested
  const baseFilter = includeInactive ? {} : { isActive: true };

  if (search) {
    const filter = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ],
      ...baseFilter,
    };
    products = await productRepository.findAll(filter, options);
  } else if (category && category !== "all") {
    products = await productRepository.findAll(
      { category, ...baseFilter },
      options
    );
  } else if (minPrice || maxPrice) {
    const min = minPrice ? parseFloat(minPrice) : 0;
    const max = maxPrice ? parseFloat(maxPrice) : Number.MAX_VALUE;
    const filter = {
      price: { $gte: min, $lte: max },
      ...baseFilter,
    };
    products = await productRepository.findAll(filter, options);
  } else {
    products = await productRepository.findAll(baseFilter, options);
  }

  return products.map((product) => ({
    ...product,
    imageUrl: product.imageUrl ? `/product-images/${product.imageUrl}` : null,
  }));
};

/**
 * Restore a deleted product (admin only)
 * @param {String} productId - Product ID
 * @param {Object} user - Current user
 * @returns {Object} Restored product
 */
const restoreProduct = async (productId, user) => {
  if (user.role !== "admin") {
    throw new Error("Access denied. Admin privileges required.");
  }

  const product = await productRepository.findById(productId);
  if (!product) {
    throw new Error("Product not found");
  }

  const restoredProduct = await productRepository.updateById(productId, {
    isActive: true,
    updatedAt: Date.now(),
  });

  return {
    ...restoredProduct._doc,
    imageUrl: restoredProduct.imageUrl
      ? `/product-images/${restoredProduct.imageUrl}`
      : null,
  };
};

/**
 * Get product analytics (admin only)
 * @param {Object} user - Current user
 * @returns {Object} Product analytics
 */
const getProductAnalytics = async (user) => {
  if (user.role !== "admin") {
    throw new Error("Access denied. Admin privileges required.");
  }

  const allProducts = await productRepository.findAll({}, { lean: true });
  const activeProducts = allProducts.filter((p) => p.isActive);
  const inactiveProducts = allProducts.filter((p) => !p.isActive);

  const analytics = {
    overview: {
      totalProducts: allProducts.length,
      activeProducts: activeProducts.length,
      inactiveProducts: inactiveProducts.length,
      totalStock: activeProducts.reduce((sum, p) => sum + p.stock, 0),
      totalValue: activeProducts.reduce((sum, p) => sum + p.price * p.stock, 0),
    },
    categories: {
      Kitchen: activeProducts.filter((p) => p.category === "Kitchen").length,
      Accessories: activeProducts.filter((p) => p.category === "Accessories")
        .length,
      Cloths: activeProducts.filter((p) => p.category === "Cloths").length,
    },
    priceRanges: {
      under50: activeProducts.filter((p) => p.price < 50).length,
      "50to100": activeProducts.filter((p) => p.price >= 50 && p.price < 100)
        .length,
      "100to200": activeProducts.filter((p) => p.price >= 100 && p.price < 200)
        .length,
      over200: activeProducts.filter((p) => p.price >= 200).length,
    },
    ecoRatings: {
      excellent: activeProducts.filter((p) => p.ecoRating >= 4.5).length,
      good: activeProducts.filter(
        (p) => p.ecoRating >= 3.5 && p.ecoRating < 4.5
      ).length,
      average: activeProducts.filter(
        (p) => p.ecoRating >= 2.5 && p.ecoRating < 3.5
      ).length,
      poor: activeProducts.filter((p) => p.ecoRating < 2.5).length,
    },
    stockStatus: {
      inStock: activeProducts.filter((p) => p.stock > 10).length,
      lowStock: activeProducts.filter((p) => p.stock > 0 && p.stock <= 10)
        .length,
      outOfStock: activeProducts.filter((p) => p.stock === 0).length,
    },
    topPerformers: {
      highestPriced: activeProducts
        .sort((a, b) => b.price - a.price)
        .slice(0, 5)
        .map((p) => ({
          id: p._id,
          name: p.name,
          price: p.price,
          category: p.category,
        })),
      highestEcoRated: activeProducts
        .sort((a, b) => b.ecoRating - a.ecoRating)
        .slice(0, 5)
        .map((p) => ({
          id: p._id,
          name: p.name,
          ecoRating: p.ecoRating,
          category: p.category,
        })),
      mostStock: activeProducts
        .sort((a, b) => b.stock - a.stock)
        .slice(0, 5)
        .map((p) => ({
          id: p._id,
          name: p.name,
          stock: p.stock,
          category: p.category,
        })),
    },
  };

  return analytics;
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
  getLowStockProducts,
  getProductStats,
  getAllProductsForAdmin,
  restoreProduct,
  getProductAnalytics,
};
