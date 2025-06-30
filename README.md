# E-commerce Microservices Backend

A scalable microservices architecture for an e-commerce platform built with Node.js, Express, and MongoDB.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   User Service  │    │ Product Service │
│   (Port: 4005)  │◄──►│   (Port: 4000)  │    │  (Port: 4001)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Cart Service   │    │  Order Service  │    │ Payment Service │
│  (Port: 4002)   │    │  (Port: 4003)   │    │  (Port: 4004)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### Environment Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd E-com-Project-Backend
```

2. **Install dependencies for all services**

```bash
cd backend/services
for service in */; do
  cd "$service"
  npm install
  cd ..
done
```

3. **Set up environment variables**
   Create `.env` files in each service directory with the following variables:

#### Gateway Service (.env)

```env
PORT=4005
FRONTEND_URL=http://localhost:5173
```

#### User Service (.env)

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/user-service
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:5173
```

#### Product Service (.env)

```env
PORT=4001
MONGO_URI=mongodb://localhost:27017/product-service
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:5173
USER_SERVICE_URL=http://localhost:4000
```

#### Cart Service (.env)

```env
PORT=4002
MONGO_URI=mongodb://localhost:27017/cart-service
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:5173
PRODUCT_SERVICE_URL=http://localhost:4001
```

#### Order Service (.env)

```env
PORT=4003
MONGO_URI=mongodb://localhost:27017/order-service
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:5173
CART_SERVICE_URL=http://localhost:4002
PRODUCT_SERVICE_URL=http://localhost:4001
```

#### Payment Service (.env)

```env
PORT=4004
MONGO_URI=mongodb://localhost:27017/payment-service
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:5173
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
ORDER_SERVICE_URL=http://localhost:4003
```

4. **Start all services**

```bash
# Start each service in separate terminals
cd backend/services/Gateway && npm run dev
cd backend/services/user-service && npm run dev
cd backend/services/product-service && npm run dev
cd backend/services/cart-service && npm run dev
cd backend/services/order-service && npm run dev
cd backend/services/payment-service && npm run dev
```

## 📚 API Documentation

### Base URL

All API calls should be made through the Gateway: `http://localhost:4005`

### Authentication

The API uses JWT tokens stored in HTTP-only cookies. Include credentials in requests:

```javascript
fetch("/api/auth/login", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password }),
});
```

---

## 🔐 Authentication Service

### Register User

```http
POST /api/auth/register
Content-Type: multipart/form-data

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "customer",
  "profileImage": [file] // optional
}
```

**Response:**

```json
{
  "message": "User registered successfully",
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "customer",
    "profileImage": "profile-image-url"
  }
}
```

### Login User

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "customer",
    "profileImage": "profile-image-url"
  }
}
```

### Verify Token

```http
GET /api/auth/verify
Authorization: Bearer <token>
```

### Logout

```http
POST /api/auth/logout
```

---

## 👤 User Service

### Get User Profile

```http
GET /api/users/profile
Authorization: Bearer <token>
```

### Update User Profile

```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "new_username",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "New York"
}
```

### Change Password

```http
PUT /api/users/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## 🛍️ Product Service

### Get All Products (Public)

```http
GET /api/products/public?category=Kitchen&minPrice=10&maxPrice=100&search=eco&limit=20&skip=0
```

### Get All Products (Authenticated)

```http
GET /api/products?category=Kitchen&minPrice=10&maxPrice=100&search=eco&limit=20&skip=0
Authorization: Bearer <token>
```

### Get Product by ID

```http
GET /api/products/details/:id
Authorization: Bearer <token>
```

### Create Product

```http
POST /api/products
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "name": "Eco-Friendly Water Bottle",
  "description": "Sustainable water bottle made from recycled materials",
  "price": 25.99,
  "category": "Kitchen",
  "stock": 100,
  "ecoRating": 4.5,
  "carbonFootprint": 2.3,
  "productImage": [file]
}
```

### Update Product

```http
PUT /api/products/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "name": "Updated Product Name",
  "price": 29.99,
  "stock": 150
}
```

### Delete Product

```http
DELETE /api/products/:id
Authorization: Bearer <token>
```

### Search Products

```http
GET /api/products/search?q=eco&category=Kitchen&minPrice=10&maxPrice=50
```

### Get Products by Category

```http
GET /api/products/category/:category?limit=20&skip=0
```

### Get Featured Products

```http
GET /api/products/featured?limit=10
```

### Get User's Products

```http
GET /api/products/my
Authorization: Bearer <token>
```

### Update Product Stock

```http
PATCH /api/products/:id/stock
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 50
}
```

---

## 🛒 Cart Service

### Get Cart

```http
GET /api/cart/:userId
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "userId": "user-id",
    "items": [
      {
        "productId": "product-id",
        "quantity": 2,
        "priceAtAdd": 25.99,
        "addedAt": "2024-01-01T00:00:00.000Z",
        "product": {
          "id": "product-id",
          "name": "Eco-Friendly Water Bottle",
          "price": 25.99,
          "imageUrl": "image-url"
        }
      }
    ],
    "subtotal": 51.98,
    "shipping": 5.99,
    "total": 57.97,
    "totalItems": 2
  }
}
```

### Add to Cart

```http
POST /api/cart/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product-id",
  "quantity": 2
}
```

### Update Cart Item

```http
PUT /api/cart/:userId/:productId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3
}
```

### Remove from Cart

```http
DELETE /api/cart/:userId/:productId
Authorization: Bearer <token>
```

### Clear Cart

```http
DELETE /api/cart/:userId
Authorization: Bearer <token>
```

### Get Cart Summary

```http
GET /api/cart/:userId/summary
Authorization: Bearer <token>
```

### Get Cart Count

```http
GET /api/cart/:userId/count
Authorization: Bearer <token>
```

### Update Shipping

```http
PUT /api/cart/:userId/shipping
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingCost": 5.99
}
```

---

## 📦 Order Service

### Create Order

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "paypal"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "order-id",
    "orderNumber": "ORD-1704067200000-123",
    "userId": "user-id",
    "items": [...],
    "subtotal": 51.98,
    "shipping": 5.99,
    "total": 57.97,
    "status": "pending",
    "paymentStatus": "pending",
    "shippingAddress": {...},
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get User Orders

```http
GET /api/orders?status=pending&limit=10&skip=0
Authorization: Bearer <token>
```

### Get Order by ID

```http
GET /api/orders/:orderId
Authorization: Bearer <token>
```

### Update Order Status

```http
PUT /api/orders/:orderId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "confirmed"
}
```

### Cancel Order

```http
PUT /api/orders/:orderId/cancel
Authorization: Bearer <token>
```

### Get Order Statistics

```http
GET /api/orders/statistics
Authorization: Bearer <token>
```

---

## 💳 Payment Service

### Create Payment

```http
POST /api/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order-id",
  "amount": 57.97,
  "paymentMethod": "paypal"
}
```

### Process PayPal Payment

```http
POST /api/payments/paypal/create-order
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order-id",
  "amount": 57.97
}
```

### Capture PayPal Payment

```http
POST /api/payments/paypal/capture
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order-id",
  "paypalOrderId": "paypal-order-id"
}
```

### Get Payment Status

```http
GET /api/payments/:paymentId
Authorization: Bearer <token>
```

### Get User Payments

```http
GET /api/payments?status=completed&limit=10&skip=0
Authorization: Bearer <token>
```

---

## 🔧 Health Checks

All services provide health check endpoints:

```http
GET /health
```

**Response:**

```json
{
  "service": "Service Name",
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🛡️ Security Features

- **JWT Authentication** with HTTP-only cookies
- **CORS Protection** with configurable origins
- **Input Validation** on all endpoints
- **Rate Limiting** (to be implemented)
- **Request Logging** for monitoring

---

## 🗄️ Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  username: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: ["customer", "organizer", "admin"]),
  profileImage: String,
  status: String (enum: ["active", "banned"]),
  phone: String,
  address: String,
  city: String,
  googleId: String,
  emailVerified: Boolean,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: Date
}
```

### Product Collection

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  price: Number,
  ecoRating: Number (0-5),
  carbonFootprint: Number,
  category: String (enum: ["Kitchen", "Accessories", "Cloths"]),
  imageUrl: String,
  stock: Number,
  isActive: Boolean,
  createdBy: String (userId),
  createdAt: Date,
  updatedAt: Date
}
```

### Cart Collection

```javascript
{
  _id: ObjectId,
  userId: String,
  items: [{
    productId: String,
    quantity: Number,
    priceAtAdd: Number,
    addedAt: Date
  }],
  subtotal: Number,
  shipping: Number,
  isActive: Boolean,
  currency: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Order Collection

```javascript
{
  _id: ObjectId,
  userId: String,
  orderNumber: String (unique),
  items: [{
    productId: String,
    quantity: Number,
    priceAtOrder: Number,
    productName: String,
    productImageUrl: String
  }],
  subtotal: Number,
  shipping: Number,
  total: Number,
  currency: String,
  status: String (enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]),
  paymentId: String,
  paymentStatus: String (enum: ["pending", "paid", "failed", "refunded"]),
  paymentMethod: String (enum: ["paypal", "stripe", "cash_on_delivery"]),
  paymentCompletedAt: Date,
  updatedBy: String,
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  trackingNumber: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Payment Collection

```javascript
{
  _id: ObjectId,
  user_id: String,
  order_id: String,
  amount: Number,
  currency: String,
  payment_method: String (enum: ["paypal", "stripe", "cash_on_delivery"]),
  payment_status: String (enum: ["pending", "completed", "failed", "cancelled"]),
  transaction_id: String (unique),
  payment_details: {
    paypal_order_id: String,
    paypal_payer_id: String,
    provider: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 Deployment

### Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

1. Set up production environment variables
2. Use PM2 or similar process manager
3. Set up reverse proxy (nginx)
4. Configure SSL certificates
5. Set up monitoring and logging

---

## 🧪 Testing

```bash
# Run tests for all services
npm test

# Run tests for specific service
cd backend/services/user-service && npm test
```

---

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License.
