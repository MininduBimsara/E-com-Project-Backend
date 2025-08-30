// init-mongo-payment.js
// MongoDB initialization script for Payment Service
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

// Create indexes for better performance
db.payments.createIndex({ user_id: 1 });
db.payments.createIndex({ order_id: 1 });
db.payments.createIndex({ transaction_id: 1 }, { unique: true, sparse: true });
db.payments.createIndex({ payment_status: 1 });
db.payments.createIndex({ createdAt: -1 });
db.payments.createIndex({ "payment_details.paypal_order_id": 1 });

print("Payment Service database initialized successfully");
