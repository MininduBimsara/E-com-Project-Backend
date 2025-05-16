const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  // Reference to the user document
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  // Admin-specific fields
  phone: {
    type: String,
  },
  position: {
    type: String,
    default: "System Administrator",
  },
  department: {
    type: String,
    default: "IT",
  },
  permissions: {
    manageUsers: {
      type: Boolean,
      default: true,
    },
    manageEvents: {
      type: Boolean,
      default: true,
    },
    managePayments: {
      type: Boolean,
      default: true,
    },
    manageRefunds: {
      type: Boolean,
      default: true,
    },
    managePlatformSettings: {
      type: Boolean,
      default: true,
    },
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  emailNotifications: {
    newUsers: {
      type: Boolean,
      default: true,
    },
    newEvents: {
      type: Boolean,
      default: true,
    },
    refundRequests: {
      type: Boolean,
      default: true,
    },
    systemAlerts: {
      type: Boolean,
      default: true,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field on save
adminSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
