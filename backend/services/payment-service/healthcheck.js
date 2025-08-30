// backend/services/payment-service/healthcheck.js
const http = require("http");

const options = {
  hostname: "localhost",
  port: process.env.PORT || 4004,
  path: "/health",
  method: "GET",
  timeout: 3000,
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log("Payment Service health check passed");
    process.exit(0);
  } else {
    console.error(
      `Payment Service health check failed with status: ${res.statusCode}`
    );
    process.exit(1);
  }
});

req.on("error", (err) => {
  console.error("Payment Service health check failed:", err.message);
  process.exit(1);
});

req.on("timeout", () => {
  console.error("Payment Service health check timeout");
  req.destroy();
  process.exit(1);
});

req.end();
