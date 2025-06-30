// repositories/paymentRepository.js
const Payment = require("../models/Payment"); // Fixed: Import Payment model

/**
 * Payment Repository - Handles database operations for Payment model
 */
class PaymentRepository {
  /**
   * Create a new payment
   */
  async createPayment(paymentData) {
    const payment = new Payment(paymentData);
    return await payment.save();
  }

  /**
   * Find payment by ID
   */
  async findPaymentById(paymentId) {
    return await Payment.findById(paymentId);
  }

  /**
   * Find payment by transaction ID
   */
  async findPaymentByTransactionId(transactionId) {
    return await Payment.findOne({ transaction_id: transactionId });
  }

  /**
   * Find payments by user ID
   */
  async findPaymentsByUserId(userId, options = {}) {
    let query = Payment.find({ user_id: userId });

    if (options.status) {
      query = query.where({ payment_status: options.status });
    }

    if (options.sort) {
      query = query.sort(options.sort);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.skip) {
      query = query.skip(options.skip);
    }

    return await query;
  }

  /**
   * Update payment by ID
   */
  async updatePaymentById(paymentId, updateData) {
    return await Payment.findByIdAndUpdate(paymentId, updateData, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * Find payments by order ID
   */
  async findPaymentsByOrderId(orderId) {
    return await Payment.find({ order_id: orderId });
  }

  /**
   * Count payments by user ID
   */
  async countPaymentsByUserId(userId) {
    return await Payment.countDocuments({ user_id: userId });
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics() {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          completedPayments: {
            $sum: { $cond: [{ $eq: ["$payment_status", "completed"] }, 1, 0] },
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ["$payment_status", "pending"] }, 1, 0] },
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ["$payment_status", "failed"] }, 1, 0] },
          },
          paypalPayments: {
            $sum: { $cond: [{ $eq: ["$payment_method", "paypal"] }, 1, 0] },
          },
          averageAmount: { $avg: "$amount" },
        },
      },
    ];

    const result = await Payment.aggregate(pipeline);
    return (
      result[0] || {
        totalPayments: 0,
        totalAmount: 0,
        completedPayments: 0,
        pendingPayments: 0,
        failedPayments: 0,
        paypalPayments: 0,
        averageAmount: 0,
      }
    );
  }
}

module.exports = new PaymentRepository();
