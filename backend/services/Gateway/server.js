const express = require("express");
const proxy = require("express-http-proxy");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use("/api/users", proxy("http://localhost:4000"));
app.use("/api/products", proxy("http://localhost:4001"));
app.use("/api/cart", proxy("http://localhost:4002"));
app.use("/api/orders", proxy("http://localhost:4003"));
app.use("/api/payments", proxy("http://localhost:4004"));


const PORT = process.env.PORT || 4005;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
