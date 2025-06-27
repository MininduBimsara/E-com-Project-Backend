const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  priceAtAdd: {
    type: Number,
    required: true,
    min: 0,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    items: [cartItemSchema],

    // Simple cart calculations
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Cart status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Currency
    currency: {
      type: String,
      default: "USD",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
cartSchema.index({ userId: 1, isActive: 1 });

// Virtual for total items count
cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for total price (subtotal + shipping)
cartSchema.virtual("total").get(function () {
  return this.subtotal + this.shipping;
});

// Method to add item to cart
cartSchema.methods.addItem = function (productId, quantity, price) {
  const existingItemIndex = this.items.findIndex(
    (item) => item.productId === productId
  );

  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].addedAt = new Date();
  } else {
    // Add new item
    this.items.push({
      productId,
      quantity,
      priceAtAdd: price,
    });
  }
};

// Method to remove item from cart
cartSchema.methods.removeItem = function (productId) {
  this.items = this.items.filter((item) => item.productId !== productId);
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function (productId, quantity) {
  const item = this.items.find((item) => item.productId === productId);
  if (item) {
    if (quantity <= 0) {
      this.removeItem(productId);
    } else {
      item.quantity = quantity;
    }
  }
};

// Method to calculate cart subtotal
cartSchema.methods.calculateSubtotal = function () {
  this.subtotal = this.items.reduce((total, item) => {
    return total + item.priceAtAdd * item.quantity;
  }, 0);
};

// Method to clear cart
cartSchema.methods.clearCart = function () {
  this.items = [];
  this.subtotal = 0;
  this.shipping = 0;
};

// Pre-save middleware to calculate subtotal
cartSchema.pre("save", function (next) {
  this.calculateSubtotal();
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
