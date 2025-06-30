// ==============================================
// models/Order.js
// ==============================================

const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  priceAtOrder: {
    type: Number,
    required: true,
    min: 0,
  },
  productName: {
    type: String,
    required: true,
  },
  productImageUrl: {
    type: String,
    default: null,
  },
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    items: [orderItemSchema],

    // Pricing details
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shipping: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },

    // Order status
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },

    // Payment information
    // Payment information
    paymentId: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["paypal", "stripe", "cash_on_delivery"],
      default: null,
    },

    // Payment timing
    paymentCompletedAt: {
      type: Date,
      default: null,
    },

    // Tracking who updated the order
    updatedBy: {
      type: String,
      default: null,
    },

    // Shipping information
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: "USA" },
    },

    // Tracking
    trackingNumber: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ paymentMethod: 1 });
orderSchema.index({ userId: 1, paymentStatus: 1 });

// Virtual for total items count
orderSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Method to generate order number
orderSchema.statics.generateOrderNumber = function () {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${timestamp}-${random}`;
};

module.exports = mongoose.model("Order", orderSchema);
