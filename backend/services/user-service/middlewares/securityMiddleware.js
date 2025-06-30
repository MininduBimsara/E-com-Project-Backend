const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const validator = require("validator");

// Rate limiting
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Specific rate limiters
const authLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
const generalLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes

// Input validation middleware
const validateInput = (req, res, next) => {
  const sanitizedBody = {};

  for (const [key, value] of Object.entries(req.body)) {
    if (typeof value === "string") {
      // Sanitize string inputs
      sanitizedBody[key] = validator.escape(validator.trim(value));
    } else {
      sanitizedBody[key] = value;
    }
  }

  req.body = sanitizedBody;
  next();
};

// Email validation
const validateEmail = (req, res, next) => {
  const { email } = req.body;

  if (email && !validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  next();
};

// Password validation
const validatePassword = (req, res, next) => {
  const { password } = req.body;

  if (password) {
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    if (!validator.matches(password, /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one lowercase letter, one uppercase letter, and one number",
      });
    }
  }

  next();
};

// Username validation
const validateUsername = (req, res, next) => {
  const { username } = req.body;

  if (username) {
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Username must be between 3 and 30 characters",
      });
    }

    if (!validator.matches(username, /^[a-zA-Z0-9_]+$/)) {
      return res.status(400).json({
        success: false,
        message: "Username can only contain letters, numbers, and underscores",
      });
    }
  }

  next();
};

// File upload validation
const validateFileUpload = (req, res, next) => {
  if (req.file) {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed",
      });
    }

    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "File size must be less than 5MB",
      });
    }
  }

  next();
};

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  frameguard: {
    action: "deny",
  },
});

module.exports = {
  createRateLimiter,
  authLimiter,
  generalLimiter,
  validateInput,
  validateEmail,
  validatePassword,
  validateUsername,
  validateFileUpload,
  securityHeaders,
};
