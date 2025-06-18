const axios = require("axios");
const cartRepository = require("../repositories/cartRepository");

/**
 * Simple Cart Service - Basic business logic for cart operations
 */
class CartService {
  constructor() {
    this.productServiceUrl =
      process.env.PRODUCT_SERVICE_URL || "http://localhost:4001";
  }

  /**
   * Get product details from product service
   * @param {String} productId - Product ID
   * @param {String} token - Auth token (optional)
   * @returns {Object} Product details
   */
  async getProductDetails(productId, token = null) {
    try {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.get(
        `${this.productServiceUrl}/api/products/details/${productId}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("Product not found");
      }
      if (error.response?.status === 403) {
        throw new Error("Product not available");
      }
      throw new Error(`Failed to fetch product details: ${error.message}`);
    }
  }

  /**
   * Get multiple product details
   * @param {Array} productIds - Array of product IDs
   * @param {String} token - Auth token (optional)
   * @returns {Object} Map of productId to product details
   */
  async getMultipleProductDetails(productIds, token = null) {
    const productMap = {};

    // Fetch products in parallel
    const productPromises = productIds.map(async (productId) => {
      try {
        const product = await this.getProductDetails(productId, token);
        productMap[productId] = product;
      } catch (error) {
        console.warn(`Failed to fetch product ${productId}:`, error.message);
        productMap[productId] = null;
      }
    });

    await Promise.all(productPromises);
    return productMap;
  }

  /**
   * Get cart with populated product details
   * @param {String} userId - User ID
   * @param {String} token - Auth token (optional)
   * @returns {Object} Cart with product details
   */
  async getCart(userId, token = null) {
    let cart = await cartRepository.findCartByUserId(userId);

    if (!cart) {
      return {
        userId,
        items: [],
        subtotal: 0,
        shipping: 0,
        total: 0,
        totalItems: 0,
      };
    }

    // Get product details for all items
    if (cart.items.length > 0) {
      const productIds = cart.items.map((item) => item.productId);
      const productMap = await this.getMultipleProductDetails(
        productIds,
        token
      );

      // Enrich cart items with product details
      const enrichedItems = cart.items.map((item) => ({
        ...item.toObject(),
        product: productMap[item.productId] || null,
      }));

      return {
        ...cart.toObject(),
        items: enrichedItems,
        totalItems: cart.totalItems,
        total: cart.total,
      };
    }

    return {
      ...cart.toObject(),
      totalItems: cart.totalItems,
      total: cart.total,
    };
  }

  /**
   * Add item to cart
   * @param {String} userId - User ID
   * @param {String} productId - Product ID
   * @param {Number} quantity - Quantity to add
   * @param {String} token - Auth token (optional)
   * @returns {Object} Updated cart
   */
  async addToCart(userId, productId, quantity, token = null) {
    if (!productId || !quantity || quantity <= 0) {
      throw new Error("Invalid product ID or quantity");
    }

    // Get product details to validate and get current price
    const product = await this.getProductDetails(productId, token);

    if (!product.isActive) {
      throw new Error("Product is not available");
    }

    if (product.stock < quantity) {
      throw new Error(
        `Insufficient stock. Only ${product.stock} items available`
      );
    }

    // Get or create cart
    let cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
      cart = cartRepository.createCart(userId);
    }

    // Check if adding this quantity would exceed stock
    const existingItem = cart.items.find(
      (item) => item.productId === productId
    );
    const totalQuantityAfterAdd = existingItem
      ? existingItem.quantity + quantity
      : quantity;

    if (totalQuantityAfterAdd > product.stock) {
      throw new Error(
        `Cannot add ${quantity} items. Total would exceed available stock of ${product.stock}`
      );
    }

    // Add item to cart
    cart.addItem(productId, quantity, product.price);

    await cartRepository.saveCart(cart);
    return await this.getCart(userId, token);
  }

  /**
   * Update item quantity in cart
   * @param {String} userId - User ID
   * @param {String} productId - Product ID
   * @param {Number} quantity - New quantity
   * @param {String} token - Auth token (optional)
   * @returns {Object} Updated cart
   */
  async updateCartItem(userId, productId, quantity, token = null) {
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    const existingItem = cart.items.find(
      (item) => item.productId === productId
    );
    if (!existingItem) {
      throw new Error("Item not found in cart");
    }

    if (quantity <= 0) {
      return await this.removeFromCart(userId, productId, token);
    }

    // Validate stock availability
    const product = await this.getProductDetails(productId, token);
    if (quantity > product.stock) {
      throw new Error(
        `Insufficient stock. Only ${product.stock} items available`
      );
    }

    cart.updateItemQuantity(productId, quantity);
    await cartRepository.saveCart(cart);

    return await this.getCart(userId, token);
  }

  /**
   * Remove item from cart
   * @param {String} userId - User ID
   * @param {String} productId - Product ID
   * @param {String} token - Auth token (optional)
   * @returns {Object} Updated cart
   */
  async removeFromCart(userId, productId, token = null) {
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    const itemExists = cart.items.some((item) => item.productId === productId);
    if (!itemExists) {
      throw new Error("Item not found in cart");
    }

    cart.removeItem(productId);
    await cartRepository.saveCart(cart);

    return await this.getCart(userId, token);
  }

  /**
   * Clear entire cart
   * @param {String} userId - User ID
   * @returns {Object} Cleared cart
   */
  async clearCart(userId) {
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
      return { message: "Cart is already empty" };
    }

    cart.clearCart();
    await cartRepository.saveCart(cart);

    return { message: "Cart cleared successfully" };
  }

  /**
   * Get cart items count
   * @param {String} userId - User ID
   * @returns {Number} Total items count
   */
  async getCartItemsCount(userId) {
    return await cartRepository.getCartItemsCount(userId);
  }

  /**
   * Get cart summary (lightweight version)
   * @param {String} userId - User ID
   * @returns {Object} Cart summary
   */
  async getCartSummary(userId) {
    const cart = await cartRepository.findCartByUserId(userId);

    if (!cart) {
      return {
        userId,
        totalItems: 0,
        subtotal: 0,
        total: 0,
        hasItems: false,
      };
    }

    return {
      userId: cart.userId,
      totalItems: cart.totalItems,
      subtotal: cart.subtotal,
      total: cart.total,
      hasItems: cart.items.length > 0,
      lastUpdated: cart.updatedAt,
    };
  }

  /**
   * Update shipping cost
   * @param {String} userId - User ID
   * @param {Number} shippingCost - Shipping cost
   * @returns {Object} Updated cart
   */
  async updateShipping(userId, shippingCost = 0) {
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    cart.shipping = shippingCost;
    await cartRepository.saveCart(cart);

    return await this.getCart(userId);
  }

  /**
   * Get cart statistics (for admin dashboard)
   * @returns {Object} Cart statistics
   */
  async getCartStatistics() {
    return await cartRepository.getCartStatistics();
  }

  /**
   * Validate cart items against current product data
   * @param {String} userId - User ID
   * @param {String} token - Auth token (optional)
   * @returns {Object} Validation result
   */
  async validateCart(userId, token = null) {
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    if (!cart.items || cart.items.length === 0) {
      return { valid: true, issues: [] };
    }

    const productIds = cart.items.map((item) => item.productId);
    const productMap = await this.getMultipleProductDetails(productIds, token);

    const issues = [];

    for (const item of cart.items) {
      const product = productMap[item.productId];

      if (!product) {
        issues.push({
          type: "PRODUCT_NOT_FOUND",
          productId: item.productId,
          message: "Product no longer available",
        });
        continue;
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        issues.push({
          type: "INSUFFICIENT_STOCK",
          productId: item.productId,
          requestedQuantity: item.quantity,
          availableStock: product.stock,
          message: `Only ${product.stock} items available`,
        });
      }

      // Check price changes
      if (Math.abs(product.price - item.priceAtAdd) > 0.01) {
        issues.push({
          type: "PRICE_CHANGED",
          productId: item.productId,
          oldPrice: item.priceAtAdd,
          newPrice: product.price,
          message: `Price changed from $${item.priceAtAdd} to $${product.price}`,
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      cart: await this.getCart(userId, token),
    };
  }
}

module.exports = new CartService();
