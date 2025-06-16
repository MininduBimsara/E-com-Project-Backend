const cartRepository = require("../repositories/cartRepository");

const getCart = async (userId) => {
  let cart = await cartRepository.findCartByUserId(userId);
  return cart || { userId, items: [] };
};

const addToCart = async (userId, productId, quantity) => {
  let cart = await cartRepository.findCartByUserId(userId);
  if (!cart) {
    cart = cartRepository.createCart(userId);
  }

  const existingItem = cart.items.find((item) => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity });
  }

  return await cartRepository.saveCart(cart);
};

const removeFromCart = async (userId, productId) => {
  const cart = await cartRepository.findCartByUserId(userId);
  if (!cart) {
    throw new Error("Cart not found");
  }

  cart.items = cart.items.filter((item) => item.productId !== productId);
  return await cartRepository.saveCart(cart);
};

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
};
