// ==============================================
// init-mongo-product.js
// MongoDB initialization script for Product Service
// ==============================================
db.createUser({
  user: "productuser",
  pwd: "productpass123",
  roles: [
    {
      role: "readWrite",
      db: "product-service",
    },
  ],
});

// Create indexes based on Product model
db.products.createIndex({ name: "text", description: "text" }); // Text search index
db.products.createIndex({ category: 1 });
db.products.createIndex({ createdBy: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ ecoRating: -1 }); // For featured products
db.products.createIndex({ isActive: 1 });
db.products.createIndex({ stock: 1 });
db.products.createIndex({ createdAt: -1 });
db.products.createIndex({ name: 1 });

print("Product Service database initialized successfully");
