const Product = require("../models/Product");

/**
 * Product Repository - Handles all database operations for Product model
 */
class ProductRepository {
  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @returns {Object} Created product document
   */
  async create(productData) {
    const product = new Product(productData);
    return await product.save();
  }

  /**
   * Find product by ID
   * @param {String} productId - Product ID
   * @returns {Object|null} Product document or null
   */
  async findById(productId) {
    return await Product.findById(productId);
  }

  /**
   * Find all products with optional filter
   * @param {Object} filter - MongoDB filter object
   * @param {Object} options - Query options
   * @returns {Array} Array of product documents
   */
  async findAll(filter = {}, options = {}) {
    let query = Product.find({ ...filter, isActive: true });

    if (options.sort) {
      query = query.sort(options.sort);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.skip) {
      query = query.skip(options.skip);
    }
    if (options.lean) {
      query = query.lean();
    }

    return await query;
  }

  /**
   * Find products by category
   * @param {String} category - Product category
   * @param {Object} options - Query options
   * @returns {Array} Array of product documents
   */
  async findByCategory(category, options = {}) {
    return await this.findAll({ category }, options);
  }

  /**
   * Find products by user ID (who created them)
   * @param {String} userId - User ID
   * @returns {Array} Array of product documents
   */
  async findByUserId(userId) {
    return await Product.find({ createdBy: userId });
  }

  /**
   * Update product by ID
   * @param {String} productId - Product ID
   * @param {Object} updateData - Data to update
   * @returns {Object|null} Updated product document
   */
  async updateById(productId, updateData) {
    return await Product.findByIdAndUpdate(productId, updateData, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * Delete product by ID (soft delete)
   * @param {String} productId - Product ID
   * @returns {Object|null} Updated product document
   */
  async deleteById(productId) {
    return await Product.findByIdAndUpdate(
      productId,
      { isActive: false },
      { new: true }
    );
  }

  /**
   * Hard delete product by ID
   * @param {String} productId - Product ID
   * @returns {Object|null} Deleted product document
   */
  async hardDeleteById(productId) {
    return await Product.findByIdAndDelete(productId);
  }

  /**
   * Search products by name or description
   * @param {String} searchQuery - Search query
   * @param {Object} options - Query options
   * @returns {Array} Array of product documents
   */
  async search(searchQuery, options = {}) {
    const filter = {
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ],
      isActive: true,
    };
    return await this.findAll(filter, options);
  }

  /**
   * Find products by price range
   * @param {Number} minPrice - Minimum price
   * @param {Number} maxPrice - Maximum price
   * @param {Object} options - Query options
   * @returns {Array} Array of product documents
   */
  async findByPriceRange(minPrice, maxPrice, options = {}) {
    const filter = {
      price: {
        $gte: minPrice,
        $lte: maxPrice,
      },
    };
    return await this.findAll(filter, options);
  }

  /**
   * Count products with optional filter
   * @param {Object} filter - MongoDB filter object
   * @returns {Number} Count of documents
   */
  async count(filter = {}) {
    return await Product.countDocuments({ ...filter, isActive: true });
  }

  /**
   * Check if product exists
   * @param {String} productId - Product ID
   * @returns {Boolean} True if product exists
   */
  async exists(productId) {
    const product = await Product.findById(productId).select("_id");
    return !!product;
  }

  /**
   * Update product stock
   * @param {String} productId - Product ID
   * @param {Number} quantity - Quantity to add/subtract
   * @returns {Object|null} Updated product document
   */
  async updateStock(productId, quantity) {
    return await Product.findByIdAndUpdate(
      productId,
      { $inc: { stock: quantity } },
      { new: true }
    );
  }

  /**
   * Get featured products (high eco rating)
   * @param {Number} limit - Number of products to return
   * @returns {Array} Array of featured products
   */
  async findFeatured(limit = 10) {
    return await this.findAll(
      { ecoRating: { $gte: 4 } },
      { sort: { ecoRating: -1 }, limit }
    );
  }

  /**
   * Find products by multiple IDs
   * @param {Array} productIds - Array of product IDs
   * @returns {Array} Array of product documents
   */
  async findByIds(productIds) {
    return await Product.find({ _id: { $in: productIds }, isActive: true });
  }
}

module.exports = new ProductRepository();
