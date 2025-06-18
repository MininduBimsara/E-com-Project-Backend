const Cart = require("../models/Cart");

/**
 * Simple Cart Repository - Basic database operations for Cart model
 */
class CartRepository {
  /**
   * Find cart by user ID
   * @param {String} userId - User ID
   * @returns {Object|null} Cart document or null
   */
  async findCartByUserId(userId) {
    return await Cart.findOne({
      userId,
      isActive: true,
    });
  }

  /**
   * Create new cart
   * @param {String} userId - User ID
   * @returns {Object} New cart document
   */
  createCart(userId) {
    return new Cart({
      userId,
      items: [],
      subtotal: 0,
      shipping: 0,
    });
  }

  /**
   * Save cart
   * @param {Object} cart - Cart document
   * @returns {Object} Saved cart document
   */
  async saveCart(cart) {
    return await cart.save();
  }

  /**
   * Delete cart by user ID (soft delete)
   * @param {String} userId - User ID
   * @returns {Object} Deletion result
   */
  async deleteCartByUserId(userId) {
    return await Cart.findOneAndUpdate(
      { userId },
      { isActive: false },
      { new: true }
    );
  }

  /**
   * Find cart by ID
   * @param {String} cartId - Cart ID
   * @returns {Object|null} Cart document or null
   */
  async findCartById(cartId) {
    return await Cart.findById(cartId);
  }

  /**
   * Get cart count by user ID
   * @param {String} userId - User ID
   * @returns {Number} Total items count
   */
  async getCartItemsCount(userId) {
    const cart = await this.findCartByUserId(userId);
    if (!cart) return 0;

    return cart.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Find carts by product ID (useful for product updates)
   * @param {String} productId - Product ID
   * @returns {Array} Array of carts containing the product
   */
  async findCartsByProductId(productId) {
    return await Cart.find({
      "items.productId": productId,
      isActive: true,
    });
  }

  /**
   * Remove product from all carts
   * @param {String} productId - Product ID
   * @returns {Object} Update result
   */
  async removeProductFromAllCarts(productId) {
    return await Cart.updateMany(
      {},
      { $pull: { items: { productId: productId } } }
    );
  }

  /**
   * Get basic cart statistics
   * @returns {Object} Cart statistics
   */
  async getCartStatistics() {
    const totalCarts = await Cart.countDocuments({ isActive: true });
    const cartsWithItems = await Cart.countDocuments({
      isActive: true,
      "items.0": { $exists: true },
    });

    return {
      totalCarts,
      cartsWithItems,
      emptyCarts: totalCarts - cartsWithItems,
    };
  }
}

module.exports = new CartRepository();
