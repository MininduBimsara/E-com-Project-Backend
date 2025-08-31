// ==============================================
// init-mongo-payment.js (Updated based on your model)
// MongoDB initialization script for Payment Service
// ==============================================
db.createUser({
  user: "paymentuser",
  pwd: "paymentpass123",
  roles: [
    {
      role: "readWrite",
      db: "payment-service",
    },
  ],
});

// Create indexes based on Payment model
db.payments.createIndex({ user_id: 1, payment_status: 1 });
db.payments.createIndex({ transaction_id: 1 }, { unique: true, sparse: true });
db.payments.createIndex({ user_id: 1 });
db.payments.createIndex({ order_id: 1 });
db.payments.createIndex({ payment_status: 1 });
db.payments.createIndex({ payment_method: 1 });
db.payments.createIndex({ createdAt: -1 });
db.payments.createIndex({ "payment_details.paypal_order_id": 1 });

print("Payment Service database initialized successfully");
