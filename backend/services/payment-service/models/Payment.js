// models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    order_id: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    payment_method: {
      type: String,
      enum: ["paypal", "stripe", "cash_on_delivery"],
      required: true,
    },
    payment_status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    transaction_id: {
      type: String,
      unique: true,
      sparse: true,
    },
    payment_details: {
      paypal_order_id: { type: String },
      paypal_payer_id: { type: String },
      provider: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentSchema.index({ user_id: 1, payment_status: 1 });
paymentSchema.index({ transaction_id: 1 });
paymentSchema.index({ "payment_details.paypal_order_id": 1 });

module.exports = mongoose.model("Payment", paymentSchema);
