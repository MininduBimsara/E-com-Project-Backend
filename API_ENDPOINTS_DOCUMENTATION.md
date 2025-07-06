# E-Commerce Backend API Documentation

## Gateway Service

**Base URL**: `http://localhost:5000` (or your configured gateway port)

The gateway service acts as a reverse proxy and routes requests to the appropriate microservices. All endpoints below are accessible through the gateway.

---

## 🔐 Authentication Service (`/api/auth`)

**Service Port**: 4000

### Public Endpoints

| Method | Endpoint             | Description         | Request Body                                   | Response               |
| ------ | -------------------- | ------------------- | ---------------------------------------------- | ---------------------- |
| `POST` | `/api/auth/register` | Register a new user | `{ username, email, password, profileImage? }` | User object with token |
| `POST` | `/api/auth/login`    | Login user          | `{ email, password }`                          | User object with token |
| `POST` | `/api/auth/logout`   | Logout user         | -                                              | Success message        |

### Protected Endpoints

| Method | Endpoint           | Description                 | Response    |
| ------ | ------------------ | --------------------------- | ----------- |
| `GET`  | `/api/auth/verify` | Verify authentication token | User object |

---

## 👤 User Service (`/api/users`)

**Service Port**: 4000

### Protected Endpoints

| Method   | Endpoint             | Description              | Request Body                                                    | Response            |
| -------- | -------------------- | ------------------------ | --------------------------------------------------------------- | ------------------- |
| `GET`    | `/api/users/current` | Get current user profile | -                                                               | User object         |
| `GET`    | `/api/users/:id`     | Get user profile by ID   | -                                                               | User object         |
| `PUT`    | `/api/users/:id`     | Update user profile      | `{ username?, email?, phone?, address?, city?, profileImage? }` | Updated user object |
| `DELETE` | `/api/users/:id`     | Delete user profile      | -                                                               | Success message     |

---

## 🛍️ Product Service (`/api/products`)

**Service Port**: 4001

### Public Endpoints

| Method | Endpoint                           | Description              | Query Parameters           | Response                |
| ------ | ---------------------------------- | ------------------------ | -------------------------- | ----------------------- |
| `GET`  | `/api/products/public`             | Get public products      | `page?, limit?, category?` | Products array          |
| `GET`  | `/api/products/featured`           | Get featured products    | -                          | Featured products array |
| `GET`  | `/api/products/search`             | Search products          | `q, page?, limit?`         | Search results          |
| `GET`  | `/api/products/category/:category` | Get products by category | `page?, limit?`            | Products array          |
| `GET`  | `/api/products/test`               | Health check             | -                          | Status message          |

### Optional Auth Endpoints

| Method | Endpoint         | Description      | Query Parameters           | Response       |
| ------ | ---------------- | ---------------- | -------------------------- | -------------- |
| `GET`  | `/api/products/` | Get all products | `page?, limit?, category?` | Products array |

### Protected Endpoints

| Method   | Endpoint                    | Description          | Request Body                                                        | Response        |
| -------- | --------------------------- | -------------------- | ------------------------------------------------------------------- | --------------- |
| `GET`    | `/api/products/my`          | Get user's products  | -                                                                   | User's products |
| `POST`   | `/api/products/`            | Create new product   | `{ name, description, price, category, stock, productImage? }`      | Created product |
| `PUT`    | `/api/products/:id`         | Update product       | `{ name?, description?, price?, category?, stock?, productImage? }` | Updated product |
| `PATCH`  | `/api/products/:id/stock`   | Update product stock | `{ stock }`                                                         | Updated product |
| `DELETE` | `/api/products/:id`         | Delete product       | -                                                                   | Success message |
| `GET`    | `/api/products/details/:id` | Get product by ID    | -                                                                   | Product details |

**Note**: For product creation/update, use `productImage` field in multipart form data. The service stores it as `imageUrl` internally.

---

## 🛒 Cart Service (`/api/cart`)

**Service Port**: 4002

### Public Endpoints

| Method | Endpoint                    | Description         | Response     |
| ------ | --------------------------- | ------------------- | ------------ |
| `GET`  | `/api/cart/:userId/count`   | Get cart item count | Cart count   |
| `GET`  | `/api/cart/:userId/summary` | Get cart summary    | Cart summary |

### Optional Auth Endpoints

| Method   | Endpoint                            | Description           | Request Body              | Response        |
| -------- | ----------------------------------- | --------------------- | ------------------------- | --------------- |
| `GET`    | `/api/cart/:userId`                 | Get user's cart       | -                         | Cart items      |
| `POST`   | `/api/cart/:userId/add`             | Add item to cart      | `{ productId, quantity }` | Updated cart    |
| `PUT`    | `/api/cart/:userId/item/:productId` | Update cart item      | `{ quantity }`            | Updated cart    |
| `DELETE` | `/api/cart/:userId/item/:productId` | Remove item from cart | -                         | Updated cart    |
| `DELETE` | `/api/cart/:userId/clear`           | Clear cart            | -                         | Success message |
| `PUT`    | `/api/cart/:userId/shipping`        | Update shipping cost  | `{ shippingCost }`        | Updated cart    |

### Protected Endpoints

| Method | Endpoint                     | Description   | Response          |
| ------ | ---------------------------- | ------------- | ----------------- |
| `POST` | `/api/cart/:userId/validate` | Validate cart | Validation result |

### Admin Endpoints

| Method | Endpoint                     | Description         | Response        |
| ------ | ---------------------------- | ------------------- | --------------- |
| `GET`  | `/api/cart/admin/statistics` | Get cart statistics | Cart statistics |

---

## 📦 Order Service (`/api/orders`)

**Service Port**: 4003

### Optional Auth Endpoints

| Method | Endpoint       | Description      | Request Body                                | Response      |
| ------ | -------------- | ---------------- | ------------------------------------------- | ------------- |
| `POST` | `/api/orders/` | Create new order | `{ items, shippingAddress, paymentMethod }` | Created order |

**Note**: `shippingAddress` should include: `{ street, city, state, zipCode, country? }`

### Protected Endpoints

| Method | Endpoint                          | Description         | Response      |
| ------ | --------------------------------- | ------------------- | ------------- |
| `GET`  | `/api/orders/:orderId`            | Get order by ID     | Order details |
| `GET`  | `/api/orders/number/:orderNumber` | Get order by number | Order details |
| `GET`  | `/api/orders/user/:userId`        | Get user's orders   | User's orders |
| `PUT`  | `/api/orders/:orderId/cancel`     | Cancel order        | Updated order |

### Internal Service Endpoints

| Method | Endpoint                                    | Description                      | Response              |
| ------ | ------------------------------------------- | -------------------------------- | --------------------- |
| `GET`  | `/api/orders/:orderId/payment-details`      | Get order for payment processing | Order payment details |
| `PUT`  | `/api/orders/:orderId/payment-confirmation` | Update payment status            | Updated order         |

### Admin Endpoints

| Method | Endpoint                                          | Description                  | Request Body              | Response      |
| ------ | ------------------------------------------------- | ---------------------------- | ------------------------- | ------------- |
| `PUT`  | `/api/orders/admin/:orderId/status`               | Update order status          | `{ status, statusNote? }` | Updated order |
| `GET`  | `/api/orders/admin/payment-status/:paymentStatus` | Get orders by payment status | Orders array              |
| `GET`  | `/api/orders/admin/statistics`                    | Get order statistics         | Order statistics          |

---

## 💳 Payment Service (`/api/payments`)

**Service Port**: 4004

### Protected Endpoints

| Method | Endpoint                             | Description            | Request Body                 | Response             |
| ------ | ------------------------------------ | ---------------------- | ---------------------------- | -------------------- |
| `POST` | `/api/payments/paypal/create-order`  | Create PayPal order    | `{ orderId, amount }`        | PayPal order details |
| `POST` | `/api/payments/paypal/capture-order` | Capture PayPal payment | `{ orderId, paypalOrderId }` | Payment confirmation |
| `GET`  | `/api/payments/history`              | Get payment history    | Payment history              |
| `GET`  | `/api/payments/:transactionId`       | Get payment details    | Payment details              |

---

## 👨‍💼 Admin Service (`/api/admin`)

**Service Port**: 4005

### Public Endpoints

| Method | Endpoint           | Description | Request Body          | Response                |
| ------ | ------------------ | ----------- | --------------------- | ----------------------- |
| `POST` | `/api/admin/login` | Admin login | `{ email, password }` | Admin object with token |

### Protected Endpoints

| Method | Endpoint               | Description         | Response        |
| ------ | ---------------------- | ------------------- | --------------- |
| `GET`  | `/api/admin/profile`   | Get admin profile   | Admin profile   |
| `POST` | `/api/admin/logout`    | Admin logout        | Success message |
| `GET`  | `/api/admin/dashboard` | Get admin dashboard | Dashboard data  |

### User Management

| Method | Endpoint                          | Description        | Request Body | Response     |
| ------ | --------------------------------- | ------------------ | ------------ | ------------ |
| `GET`  | `/api/admin/users`                | Get all users      | -            | Users array  |
| `PUT`  | `/api/admin/users/:userId/status` | Update user status | `{ status }` | Updated user |

### Product Management

| Method | Endpoint              | Description      | Response       |
| ------ | --------------------- | ---------------- | -------------- |
| `GET`  | `/api/admin/products` | Get all products | Products array |

### Order Management

| Method | Endpoint                            | Description         | Request Body | Response      |
| ------ | ----------------------------------- | ------------------- | ------------ | ------------- |
| `GET`  | `/api/admin/orders`                 | Get all orders      | -            | Orders array  |
| `PUT`  | `/api/admin/orders/:orderId/status` | Update order status | `{ status }` | Updated order |

---

## 🏥 Health Check

| Method | Endpoint  | Description          | Response                                                   |
| ------ | --------- | -------------------- | ---------------------------------------------------------- |
| `GET`  | `/health` | Gateway health check | `{ service: "API Gateway", status: "healthy", timestamp }` |

---

## 🔧 Authentication

### Cookie-Based Authentication

The API uses HTTP-only cookies for JWT token storage. No manual token handling is required:

- **Login/Register**: Automatically sets `token` cookie
- **Protected Routes**: Automatically reads `token` cookie
- **Logout**: Automatically clears `token` cookie

### Fallback Support

Some services also support Bearer token authentication as a fallback:

```
Authorization: Bearer <your-jwt-token>
```

### File Upload

For endpoints that accept file uploads (profile images, product images), use `multipart/form-data` content type.

### Error Responses

Standard error response format:

```json
{
  "message": "Error description",
  "status": "error"
}
```

### Success Responses

Standard success response format:

```json
{
  "message": "Success description",
  "data": { ... },
  "status": "success"
}
```

---

## 📝 Notes

1. **Gateway Port**: The gateway runs on port 5000 by default
2. **Service Ports**: Each microservice runs on its own port (4000-4005)
3. **CORS**: Gateway is configured to allow requests from `http://localhost:5173` (frontend)
4. **File Uploads**: Supported for profile images and product images
5. **Optional Auth**: Some endpoints work with or without authentication
6. **Admin Routes**: Require admin privileges in addition to authentication
7. **User Registration**: Uses `username` instead of `firstName`/`lastName`
8. **Product Images**: Use `productImage` field in form data, stored as `imageUrl` internally
9. **Shipping Address**: Order service expects structured address with `street`, `city`, `state`, `zipCode`, `country`
10. **Cart Shipping**: Uses `shippingCost` field, not address fields
11. **Authentication**: Primarily handled via HTTP-only cookies, with Bearer token fallback support
12. **Payment Capture**: Uses `paypalOrderId` instead of `paymentId` in PayPal capture endpoint
13. **Missing Routes**: Some controller methods exist but aren't exposed in routes (e.g., `updateUserStatus`, `getUsers`, `getAllNonAdminUsers` in user service)

This documentation covers all endpoints exposed through the gateway service. Use these endpoints from your frontend application to interact with the backend services.
