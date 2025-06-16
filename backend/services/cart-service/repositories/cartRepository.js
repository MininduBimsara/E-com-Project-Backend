const Cart = require("../models/Cart");

const findCartByUserId = (userId) => {
  return Cart.findOne({ userId });
};

const createCart = (userId) => {
  return new Cart({ userId, items: [] });
};

const saveCart = (cart) => {
  return cart.save();
};

module.exports = {
  findCartByUserId,
  createCart,
  saveCart,
};
