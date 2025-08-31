// ==============================================
// init-mongo-order.js (Updated based on your model)
// MongoDB initialization script for Order Service
// ==============================================
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

// Create indexes based on Order model
db.orders.createIndex({ userId: 1, status: 1 });
db.orders.createIndex({ orderNumber: 1 }, { unique: true });
db.orders.createIndex({ createdAt: -1 });
db.orders.createIndex({ paymentStatus: 1 });
db.orders.createIndex({ paymentMethod: 1 });
db.orders.createIndex({ userId: 1, paymentStatus: 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ paymentId: 1 }, { sparse: true });
db.orders.createIndex({ trackingNumber: 1 }, { sparse: true });

print("Order Service database initialized successfully");
