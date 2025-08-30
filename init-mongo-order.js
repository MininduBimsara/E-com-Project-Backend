// init-mongo-order.js
// MongoDB initialization script for Order Service
db.createUser({
  user: "orderuser",
  pwd: "orderpass123",
  roles: [
    {
      role: "readWrite",
      db: "order-service",
    },
  ],
});

// Create indexes for better performance
db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ orderNumber: 1 }, { unique: true });
db.orders.createIndex({ createdAt: -1 });
db.orders.createIndex({ paymentStatus: 1 });
db.orders.createIndex({ status: 1 });

print("Order Service database initialized successfully");
