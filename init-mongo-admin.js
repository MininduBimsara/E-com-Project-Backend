// ==============================================
// init-mongo-admin.js
// MongoDB initialization script for Admin Service
// ==============================================
db.createUser({
  user: "adminuser",
  pwd: "adminpass123",
  roles: [
    {
      role: "readWrite",
      db: "admin-service",
    },
  ],
});

// Create indexes based on Admin model
db.admins.createIndex({ email: 1 }, { unique: true });
db.admins.createIndex({ userId: 1 }, { unique: true });
db.admins.createIndex({ username: 1 }, { unique: true });
db.admins.createIndex({ role: 1 });
db.admins.createIndex({ status: 1 });
db.admins.createIndex({ createdAt: -1 });
db.admins.createIndex({ lastLoginAt: -1 }, { sparse: true });

print("Admin Service database initialized successfully");
