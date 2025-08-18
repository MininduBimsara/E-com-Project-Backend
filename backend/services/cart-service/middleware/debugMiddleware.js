// backend/services/cart-service/middleware/debugMiddleware.js
const debugMiddleware = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  console.log("\n=== CART SERVICE DEBUG ===");
  console.log("🕐 Timestamp:", new Date().toISOString());
  console.log("🌐 Method:", req.method);
  console.log("🔗 URL:", req.originalUrl);
  console.log("🔑 Headers:", {
    "content-type": req.headers["content-type"],
    authorization: req.headers.authorization
      ? `Bearer ${req.headers.authorization.substring(7, 20)}...`
      : "None",
    "user-agent": req.headers["user-agent"]?.substring(0, 50) + "...",
  });
  console.log("📦 Body:", req.body);
  console.log("📋 Params:", req.params);
  console.log("❓ Query:", req.query);

  // Override res.send to log response
  res.send = function (data) {
    console.log("📤 Response Status:", res.statusCode);
    console.log(
      "📤 Response Data:",
      typeof data === "string" ? data.substring(0, 200) + "..." : data
    );
    console.log("=== END DEBUG ===\n");
    return originalSend.call(this, data);
  };

  // Override res.json to log response
  res.json = function (data) {
    console.log("📤 Response Status:", res.statusCode);
    console.log("📤 JSON Response:", data);
    console.log("=== END DEBUG ===\n");
    return originalJson.call(this, data);
  };

  next();
};

module.exports = debugMiddleware;
