// Environment validation for User Service
const validateEnvironment = () => {
  const requiredEnvVars = ["MONGO_URI", "JWT_SECRET"];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    console.error(
      "\nPlease check your .env file or environment configuration."
    );
    process.exit(1);
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error("❌ JWT_SECRET must be at least 32 characters long");
    process.exit(1);
  }

  console.log("✅ Environment validation passed");
};

module.exports = { validateEnvironment };
