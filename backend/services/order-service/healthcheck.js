// backend/services/order-service/healthcheck.js
const http = require("http");

const options = {
  hostname: "localhost",
  port: process.env.PORT || 4003,
  path: "/health",
  method: "GET",
  timeout: 3000,
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log("Order Service health check passed");
    process.exit(0);
  } else {
    console.error(
      `Order Service health check failed with status: ${res.statusCode}`
    );
    process.exit(1);
  }
});

req.on("error", (err) => {
  console.error("Order Service health check failed:", err.message);
  process.exit(1);
});

req.on("timeout", () => {
  console.error("Order Service health check timeout");
  req.destroy();
  process.exit(1);
});

req.end();
