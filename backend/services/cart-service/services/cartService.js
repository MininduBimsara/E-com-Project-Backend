const axios = require("axios");
const cartRepository = require("../repositories/cartRepository");

/**
 * Enhanced Cart Service with transaction support and better error handling
 */
class CartService {
  constructor() {
    this.productServiceUrl =
      process.env.PRODUCT_SERVICE_URL || "http://localhost:4001";
  }

  /**
   * Get product details from product service with retry logic
   */
  async getProductDetails(productId, token = null, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const headers = {};
        if (token) {
          headers.Cookie = `token=${token}`;
        }

        const response = await axios.get(
          `${this.productServiceUrl}/api/products/details/${productId}`,
          {
            headers,
            timeout: 5000,
          }
        );
        return response.data;
      } catch (error) {
        if (attempt === retries) {
          if (error.response?.status === 404) {
            throw new Error("Product not found");
          }
          if (error.response?.status === 403) {
            throw new Error("Product not available");
          }
          throw new Error(`Failed to fetch product details: ${error.message}`);
        }
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Reserve product stock to prevent race conditions
   */
  async reserveProductStock(productId, quantity, token) {
    try {
      const response = await axios.patch(
        `${this.productServiceUrl}/api/products/${productId}/stock`,
        { quantity: -quantity }, // Negative to reserve
        {
          headers: { Cookie: `token=${token}` },
          timeout: 5000,
        }
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error("Insufficient stock");
      }
      throw new Error("Failed to reserve product stock");
    }
  }

  /**
   * Release reserved product stock
   */
  async releaseProductStock(productId, quantity, token) {
    try {
      await axios.patch(
        `${this.productServiceUrl}/api/products/${productId}/stock`,
        { quantity: quantity }, // Positive to release
        {
          headers: { Cookie: `token=${token}` },
          timeout: 5000,
        }
      );
    } catch (error) {
      console.error("Failed to release product stock:", error.message);
    }
  }

  /**
   * Get cart with populated product details
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
   * Add item to cart with transaction support
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

    // Start transaction-like operation
    let stockReserved = false;
    try {
      // Reserve stock first
      await this.reserveProductStock(productId, quantity, token);
      stockReserved = true;

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
    } catch (error) {
      // Rollback: release reserved stock if reservation was successful
      if (stockReserved) {
        await this.releaseProductStock(productId, quantity, token);
      }
      throw error;
    }
  }

  /**
   * Update item quantity in cart with transaction support
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

    // Calculate stock difference
    const stockDifference = quantity - existingItem.quantity;

    if (stockDifference > 0) {
      // Need to reserve more stock
      try {
        await this.reserveProductStock(productId, stockDifference, token);

        // Update cart
        existingItem.quantity = quantity;
        await cartRepository.saveCart(cart);

        return await this.getCart(userId, token);
      } catch (error) {
        throw new Error(
          `Insufficient stock. Only ${existingItem.quantity} items available`
        );
      }
    } else if (stockDifference < 0) {
      // Release excess stock
      await this.releaseProductStock(
        productId,
        Math.abs(stockDifference),
        token
      );

      // Update cart
      existingItem.quantity = quantity;
      await cartRepository.saveCart(cart);

      return await this.getCart(userId, token);
    }

    // No change in quantity
    return await this.getCart(userId, token);
  }

  /**
   * Remove from cart with stock release
   */
  async removeFromCart(userId, productId, token = null) {
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

    // Release reserved stock
    await this.releaseProductStock(productId, existingItem.quantity, token);

    // Remove item from cart
    cart.removeItem(productId);
    await cartRepository.saveCart(cart);

    return await this.getCart(userId, token);
  }

  /**
   * Clear cart with stock release
   */
  async clearCart(userId, token = null) {
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    // Release all reserved stock
    const releasePromises = cart.items.map((item) =>
      this.releaseProductStock(item.productId, item.quantity, token)
    );
    await Promise.all(releasePromises);

    // Clear cart
    cart.clearCart();
    await cartRepository.saveCart(cart);

    return { message: "Cart cleared successfully" };
  }

  /**
   * Get multiple product details with error handling
   */
  async getMultipleProductDetails(productIds, token = null) {
    const productMap = {};

    // Fetch products in parallel with individual error handling
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
   * Get cart items count
   */
  async getCartItemsCount(userId) {
    const cart = await cartRepository.findCartByUserId(userId);
    return cart ? cart.totalItems : 0;
  }

  /**
   * Get cart summary
   */
  async getCartSummary(userId) {
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
      return {
        totalItems: 0,
        subtotal: 0,
        shipping: 0,
        total: 0,
      };
    }

    return {
      totalItems: cart.totalItems,
      subtotal: cart.subtotal,
      shipping: cart.shipping,
      total: cart.total,
    };
  }

  /**
   * Update shipping cost
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
   * Get cart statistics
   */
  async getCartStatistics() {
    return await cartRepository.getCartStatistics();
  }

  /**
   * Validate cart items
   */
  async validateCart(userId, token = null) {
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart || cart.items.length === 0) {
      return { valid: false, message: "Cart is empty" };
    }

    const validationResults = await Promise.all(
      cart.items.map(async (item) => {
        try {
          const product = await this.getProductDetails(item.productId, token);

          if (!product.isActive) {
            return {
              productId: item.productId,
              valid: false,
              message: "Product is no longer available",
            };
          }

          if (product.stock < item.quantity) {
            return {
              productId: item.productId,
              valid: false,
              message: `Insufficient stock. Only ${product.stock} available`,
            };
          }

          return {
            productId: item.productId,
            valid: true,
          };
        } catch (error) {
          return {
            productId: item.productId,
            valid: false,
            message: "Product not found",
          };
        }
      })
    );

    const invalidItems = validationResults.filter((result) => !result.valid);

    return {
      valid: invalidItems.length === 0,
      invalidItems,
      message:
        invalidItems.length > 0 ? "Some items are invalid" : "Cart is valid",
    };
  }
}

module.exports = new CartService();
