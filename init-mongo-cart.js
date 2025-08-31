// ==============================================
// init-mongo-cart.js
// MongoDB initialization script for Cart Service
// ==============================================
db.createUser({
  user: "cartuser",
  pwd: "cartpass123",
  roles: [
    {
      role: "readWrite",
      db: "cart-service",
    },
  ],
});

// Create indexes based on Cart model
db.carts.createIndex({ userId: 1, isActive: 1 });
db.carts.createIndex({ userId: 1 }, { unique: true }); // One cart per user
db.carts.createIndex({ "items.productId": 1 });
db.carts.createIndex({ isActive: 1 });
db.carts.createIndex({ updatedAt: -1 });
db.carts.createIndex({ createdAt: -1 });

print("Cart Service database initialized successfully");
