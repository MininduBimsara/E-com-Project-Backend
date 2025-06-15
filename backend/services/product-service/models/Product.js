const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    ecoRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    carbonFootprint: {
      type: Number,
      min: 0,
      default: 0,
    },
    category: {
      type: String,
      required: true,
      enum: ["Kitchen", "Accessories", "Cloths"],
      default: "Kitchen",
    },
    imageUrl: {
      type: String,
      default: null,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String, // This will store the user ID from the auth service
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better search performance
productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1 });
productSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Product", productSchema);
