const User = require("../models/User");

const updatePassword = async (userId, hashedPassword) => {
  return await User.findByIdAndUpdate(
    userId,
    { password: hashedPassword },
    { new: true }
  );
};

module.exports = {
  updatePassword,
};
