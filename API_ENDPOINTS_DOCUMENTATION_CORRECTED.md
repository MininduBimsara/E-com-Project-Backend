# E-Commerce Backend API Documentation (Corrected)

## Gateway Service

**Base URL**: `http://localhost:5000` (or your configured gateway port)

The gateway service acts as a reverse proxy and routes requests to the appropriate microservices. All endpoints below are accessible through the gateway.

---

## 🔐 Authentication Service (`/api/auth`)

**Service Port**: 4000  
**Service Route**: `/auth` (maps to `/api/auth` via gateway)

### Public Endpoints

| Method | Endpoint             | Description         | Request Body                                              | Response               |
| ------ | -------------------- | ------------------- | --------------------------------------------------------- | ---------------------- |
| `POST` | `/api/auth/register` | Register a new user | `{ email, password, firstName, lastName, profileImage? }` | User object with token |
| `POST` | `/api/auth/login`    | Login user          | `{ email, password }`                                     | User object with token |
| `POST` | `/api/auth/logout`   | Logout user         | -                                                         | Success message        |

### Protected Endpoints

| Method | Endpoint           | Description                 | Headers                         | Response    |
| ------ | ------------------ | --------------------------- | ------------------------------- | ----------- |
| `GET`  | `/api/auth/verify` | Verify authentication token | `Authorization: Bearer <token>` | User object |

---

## 👤 User Service (`/api/users`)

**Service Port**: 4000  
**Service Route**: `/users` (maps to `/api/users` via gateway)

### Protected Endpoints

| Method   | Endpoint             | Description              | Headers                         | Request Body                                       | Response            |
| -------- | -------------------- | ------------------------ | ------------------------------- | -------------------------------------------------- | ------------------- |
| `GET`    | `/api/users/current` | Get current user profile | `Authorization: Bearer <token>` | -                                                  | User object         |
| `GET`    | `/api/users/:id`     | Get user profile by ID   | `Authorization: Bearer <token>` | -                                                  | User object         |
| `PUT`    | `/api/users/:id`     | Update user profile      | `Authorization: Bearer <token>` | `{ firstName?, lastName?, email?, profileImage? }` | Updated user object |
| `DELETE` | `/api/users/:id`     | Delete user profile      | `Authorization: Bearer <token>` | -                                                  | Success message     |

---

## 🛍️ Product Service (`/api/products`)

**Service Port**: 4001  
**Service Route**: `/` (maps to `/api/products` via gateway)

### Public Endpoints

| Method | Endpoint                           | Description              | Query Parameters           | Response                |
| ------ | ---------------------------------- | ------------------------ | -------------------------- | ----------------------- |
| `GET`  | `/api/products/public`             | Get public products      | `page?, limit?, category?` | Products array          |
| `GET`  | `/api/products/featured`           | Get featured products    | -                          | Featured products array |
| `GET`  | `/api/products/search`             | Search products          | `q, page?, limit?`         | Search results          |
| `GET`  | `/api/products/category/:category` | Get products by category | `page?, limit?`            | Products array          |
| `GET`  | `/api/products/test`               | Health check             | -                          | Status message          |

### Optional Auth Endpoints

| Method | Endpoint         | Description      | Headers                                    | Query Parameters           | Response       |
| ------ | ---------------- | ---------------- | ------------------------------------------ | -------------------------- | -------------- |
| `GET`  | `/api/products/` | Get all products | `Authorization: Bearer <token>` (optional) | `page?, limit?, category?` | Products array |

### Protected Endpoints

| Method   | Endpoint                    | Description          | Headers                         | Request Body                                                        | Response        |
| -------- | --------------------------- | -------------------- | ------------------------------- | ------------------------------------------------------------------- | --------------- |
| `GET`    | `/api/products/my`          | Get user's products  | `Authorization: Bearer <token>` | -                                                                   | User's products |
| `POST`   | `/api/products/`            | Create new product   | `Authorization: Bearer <token>` | `{ name, description, price, category, stock, productImage? }`      | Created product |
| `PUT`    | `/api/products/:id`         | Update product       | `Authorization: Bearer <token>` | `{ name?, description?, price?, category?, stock?, productImage? }` | Updated product |
| `PATCH`  | `/api/products/:id/stock`   | Update product stock | `Authorization: Bearer <token>` | `{ stock }`                                                         | Updated product |
| `DELETE` | `/api/products/:id`         | Delete product       | `Authorization: Bearer <token>` | -                                                                   | Success message |
| `GET`    | `/api/products/details/:id` | Get product by ID    | `Authorization: Bearer <token>` | -                                                                   | Product details |

---

## 🛒 Cart Service (`/api/cart`)

**Service Port**: 4002  
**Service Route**: `/` (maps to `/api/cart` via gateway)

### Public Endpoints

| Method | Endpoint                    | Description         | Response     |
| ------ | --------------------------- | ------------------- | ------------ |
| `GET`  | `/api/cart/:userId/count`   | Get cart item count | Cart count   |
| `GET`  | `/api/cart/:userId/summary` | Get cart summary    | Cart summary |

### Optional Auth Endpoints

| Method   | Endpoint                            | Description           | Headers                                    | Request Body                        | Response        |
| -------- | ----------------------------------- | --------------------- | ------------------------------------------ | ----------------------------------- | --------------- |
| `GET`    | `/api/cart/:userId`                 | Get user's cart       | `Authorization: Bearer <token>` (optional) | -                                   | Cart items      |
| `POST`   | `/api/cart/:userId/add`             | Add item to cart      | `Authorization: Bearer <token>` (optional) | `{ productId, quantity }`           | Updated cart    |
| `PUT`    | `/api/cart/:userId/item/:productId` | Update cart item      | `Authorization: Bearer <token>` (optional) | `{ quantity }`                      | Updated cart    |
| `DELETE` | `/api/cart/:userId/item/:productId` | Remove item from cart | `Authorization: Bearer <token>` (optional) | -                                   | Updated cart    |
| `DELETE` | `/api/cart/:userId/clear`           | Clear cart            | `Authorization: Bearer <token>` (optional) | -                                   | Success message |
| `PUT`    | `/api/cart/:userId/shipping`        | Update shipping info  | `Authorization: Bearer <token>` (optional) | `{ address, city, state, zipCode }` | Updated cart    |

### Protected Endpoints

| Method | Endpoint                     | Description   | Headers                         | Response          |
| ------ | ---------------------------- | ------------- | ------------------------------- | ----------------- |
| `POST` | `/api/cart/:userId/validate` | Validate cart | `Authorization: Bearer <token>` | Validation result |

### Admin Endpoints

| Method | Endpoint                     | Description         | Headers                         | Response        |
| ------ | ---------------------------- | ------------------- | ------------------------------- | --------------- |
| `GET`  | `/api/cart/admin/statistics` | Get cart statistics | `Authorization: Bearer <token>` | Cart statistics |

---

## 📦 Order Service (`/api/orders`)

**Service Port**: 4003  
**Service Route**: `/` (maps to `/api/orders` via gateway)

### Optional Auth Endpoints

| Method | Endpoint       | Description      | Headers                                    | Request Body                                | Response      |
| ------ | -------------- | ---------------- | ------------------------------------------ | ------------------------------------------- | ------------- |
| `POST` | `/api/orders/` | Create new order | `Authorization: Bearer <token>` (optional) | `{ items, shippingAddress, paymentMethod }` | Created order |

### Protected Endpoints

| Method | Endpoint                          | Description         | Headers                         | Response      |
| ------ | --------------------------------- | ------------------- | ------------------------------- | ------------- |
| `GET`  | `/api/orders/:orderId`            | Get order by ID     | `Authorization: Bearer <token>` | Order details |
| `GET`  | `/api/orders/number/:orderNumber` | Get order by number | `Authorization: Bearer <token>` | Order details |
| `GET`  | `/api/orders/user/:userId`        | Get user's orders   | `Authorization: Bearer <token>` | User's orders |
| `PUT`  | `/api/orders/:orderId/cancel`     | Cancel order        | `Authorization: Bearer <token>` | Updated order |

### Internal Service Endpoints

| Method | Endpoint                                    | Description                      | Response              |
| ------ | ------------------------------------------- | -------------------------------- | --------------------- |
| `GET`  | `/api/orders/:orderId/payment-details`      | Get order for payment processing | Order payment details |
| `PUT`  | `/api/orders/:orderId/payment-confirmation` | Update payment status            | Updated order         |

### Admin Endpoints

| Method | Endpoint                                          | Description                  | Headers                         | Request Body     | Response      |
| ------ | ------------------------------------------------- | ---------------------------- | ------------------------------- | ---------------- | ------------- |
| `PUT`  | `/api/orders/admin/:orderId/status`               | Update order status          | `Authorization: Bearer <token>` | `{ status }`     | Updated order |
| `GET`  | `/api/orders/admin/payment-status/:paymentStatus` | Get orders by payment status | `Authorization: Bearer <token>` | Orders array     |
| `GET`  | `/api/orders/admin/statistics`                    | Get order statistics         | `Authorization: Bearer <token>` | Order statistics |

---

## 💳 Payment Service (`/api/payments`)

**Service Port**: 4004  
**Service Route**: `/` (maps to `/api/payments` via gateway)

### Protected Endpoints

| Method | Endpoint                             | Description            | Headers                         | Request Body             | Response             |
| ------ | ------------------------------------ | ---------------------- | ------------------------------- | ------------------------ | -------------------- |
| `POST` | `/api/payments/paypal/create-order`  | Create PayPal order    | `Authorization: Bearer <token>` | `{ orderId, amount }`    | PayPal order details |
| `POST` | `/api/payments/paypal/capture-order` | Capture PayPal payment | `Authorization: Bearer <token>` | `{ orderId, paymentId }` | Payment confirmation |
| `GET`  | `/api/payments/history`              | Get payment history    | `Authorization: Bearer <token>` | Payment history          |
| `GET`  | `/api/payments/:transactionId`       | Get payment details    | `Authorization: Bearer <token>` | Payment details          |

---

## 👨‍💼 Admin Service (`/api/admin`)

**Service Port**: 4005  
**Service Route**: `/` (maps to `/api/admin` via gateway)

### Public Endpoints

| Method | Endpoint           | Description | Request Body          | Response                |
| ------ | ------------------ | ----------- | --------------------- | ----------------------- |
| `POST` | `/api/admin/login` | Admin login | `{ email, password }` | Admin object with token |

### Protected Endpoints

| Method | Endpoint               | Description         | Headers                         | Response        |
| ------ | ---------------------- | ------------------- | ------------------------------- | --------------- |
| `GET`  | `/api/admin/profile`   | Get admin profile   | `Authorization: Bearer <token>` | Admin profile   |
| `POST` | `/api/admin/logout`    | Admin logout        | `Authorization: Bearer <token>` | Success message |
| `GET`  | `/api/admin/dashboard` | Get admin dashboard | `Authorization: Bearer <token>` | Dashboard data  |

### User Management

| Method | Endpoint                          | Description        | Headers                         | Request Body | Response     |
| ------ | --------------------------------- | ------------------ | ------------------------------- | ------------ | ------------ |
| `GET`  | `/api/admin/users`                | Get all users      | `Authorization: Bearer <token>` | -            | Users array  |
| `PUT`  | `/api/admin/users/:userId/status` | Update user status | `Authorization: Bearer <token>` | `{ status }` | Updated user |

### Product Management

| Method | Endpoint              | Description      | Headers                         | Response       |
| ------ | --------------------- | ---------------- | ------------------------------- | -------------- |
| `GET`  | `/api/admin/products` | Get all products | `Authorization: Bearer <token>` | Products array |

### Order Management

| Method | Endpoint                            | Description         | Headers                         | Request Body | Response      |
| ------ | ----------------------------------- | ------------------- | ------------------------------- | ------------ | ------------- |
| `GET`  | `/api/admin/orders`                 | Get all orders      | `Authorization: Bearer <token>` | -            | Orders array  |
| `PUT`  | `/api/admin/orders/:orderId/status` | Update order status | `Authorization: Bearer <token>` | `{ status }` | Updated order |

---

## 🏥 Health Check Endpoints

Each service has its own health check endpoint:

| Service         | Method | Endpoint  | Response                                                       |
| --------------- | ------ | --------- | -------------------------------------------------------------- |
| Gateway         | `GET`  | `/health` | `{ service: "API Gateway", status: "healthy", timestamp }`     |
| User Service    | `GET`  | `/health` | `{ service: "User Service", status: "healthy", timestamp }`    |
| Product Service | `GET`  | `/health` | `{ service: "Product Service", status: "healthy", timestamp }` |
| Cart Service    | `GET`  | `/health` | `{ service: "Cart Service", status: "healthy", timestamp }`    |
| Order Service   | `GET`  | `/health` | `{ service: "Order Service", status: "healthy", timestamp }`   |
| Payment Service | `GET`  | `/health` | `{ service: "Payment Service", status: "healthy", timestamp }` |
| Admin Service   | `GET`  | `/health` | `{ service: "Admin Service", status: "healthy", timestamp }`   |

---

## 🔧 Authentication

### Token Format

All protected endpoints require a Bearer token in the Authorization header:

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

## 📝 Routing Summary

### Service Route Mappings:

- **User Service**: `/users` and `/auth` → Gateway: `/api/users` and `/api/auth`
- **Product Service**: `/` → Gateway: `/api/products`
- **Cart Service**: `/` → Gateway: `/api/cart`
- **Order Service**: `/` → Gateway: `/api/orders`
- **Payment Service**: `/` → Gateway: `/api/payments`
- **Admin Service**: `/` → Gateway: `/api/admin`

### Notes:

1. **Gateway Port**: The gateway runs on port 5000 by default
2. **Service Ports**: Each microservice runs on its own port (4000-4005)
3. **CORS**: Gateway is configured to allow requests from `http://localhost:5173` (frontend)
4. **File Uploads**: Supported for profile images and product images
5. **Optional Auth**: Some endpoints work with or without authentication
6. **Admin Routes**: Require admin privileges in addition to authentication

This documentation covers all endpoints exposed through the gateway service with the correct routing paths based on the actual server configurations.
