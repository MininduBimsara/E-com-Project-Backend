// ==============================================
// init-mongo-user.js
// MongoDB initialization script for User Service
// ==============================================
db.createUser({
  user: "useruser",
  pwd: "userpass123",
  roles: [
    {
      role: "readWrite",
      db: "user-service",
    },
  ],
});

// Create indexes based on User model
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 });
db.users.createIndex({ googleId: 1 }, { unique: true, sparse: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ status: 1 });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ resetPasswordToken: 1 }, { sparse: true });
db.users.createIndex({ resetPasswordExpires: 1 }, { sparse: true });

print("User Service database initialized successfully");
