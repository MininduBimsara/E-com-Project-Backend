const User = require("../models/User");

const findByEmail = async (email) => {
  return await User.findOne({ email });
};

const findById = async (id) => {
  return await User.findById(id);
};

const create = async (userData) => {
  return await User.create(userData);
};

const updateById = async (id, updateData) => {
  return await User.findByIdAndUpdate(id, updateData, { new: true });
};

const deleteById = async (id) => {
  return await User.findByIdAndDelete(id);
};

module.exports = {
  findByEmail,
  findById,
  create,
  updateById,
  deleteById,
};
