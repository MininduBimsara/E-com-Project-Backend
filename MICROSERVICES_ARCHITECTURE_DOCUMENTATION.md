# E-Commerce Microservices Backend - Complete Architecture Documentation

## 📋 Project Overview

This is a comprehensive e-commerce microservices backend built with Node.js, Express, and MongoDB. The system implements a distributed architecture with event-driven communication, containerization, and modern payment processing capabilities.

## 🏗️ Microservices Architecture

### Service Overview

The backend consists of **7 core microservices**:

1. **API Gateway** (Port: 5000) - Central routing and load balancing
2. **User Service** (Port: 4000) - Authentication and user management
3. **Product Service** (Port: 4001) - Product catalog management
4. **Cart Service** (Port: 4002) - Shopping cart operations
5. **Order Service** (Port: 4003) - Order processing and management
6. **Payment Service** (Port: 4004) - Payment processing with PayPal
7. **Admin Service** (Port: 4006) - Administrative operations

### Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   User Service  │    │ Product Service │
│   (Port: 5000)  │◄──►│   (Port: 4000)  │    │  (Port: 4001)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Cart Service   │    │  Order Service  │    │ Payment Service │
│  (Port: 4002)   │    │  (Port: 4003)   │    │  (Port: 4004)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │  Admin Service  │
                    │  (Port: 4006)   │
                    └─────────────────┘
```

## 🐰 RabbitMQ Event-Driven Architecture

### RabbitMQ Integration

Your system implements a sophisticated event-driven architecture using **RabbitMQ** as the message broker.

#### Key Features:
- **Topic Exchange**: `ecostore.events` for flexible routing
- **Dead Letter Queues**: Automatic retry mechanism with exponential backoff
- **Durable Queues**: Message persistence across service restarts
- **Connection Management**: Auto-reconnection with circuit breaker pattern
- **Event Correlation**: Unique correlation IDs for message tracking

#### Event Types Implemented:
```javascript
EVENT_TYPES = {
  USER_CREATED: "user.created",
  ORDER_CREATED: "order.created", 
  PAYMENT_SUCCESS: "payment.success",
  PAYMENT_FAILED: "payment.failed",
  CART_CLEARED: "cart.cleared",
  STOCK_UPDATED: "stock.updated"
}
```

#### RabbitMQ Configuration:
- **Exchange**: `ecostore.events` (Topic exchange)
- **Queue Prefix**: `ecostore`
- **Management UI**: Available on port 15672
- **Default Credentials**: admin/password123
- **Virtual Host**: `ecostore` (production), `ecostore-dev` (development)

#### Event Flow Example:
1. **Order Created** → Order Service publishes `order.created` event
2. **Payment Processing** → Payment Service consumes event and processes payment
3. **Payment Success** → Payment Service publishes `payment.success` event
4. **Order Update** → Order Service consumes payment event and updates order status

### Shared RabbitMQ Utility (`backend/shared/utils/rabbitmq.js`)

The system includes a robust RabbitMQ manager with:
- **Connection pooling** and automatic reconnection
- **Message retry logic** with exponential backoff
- **Dead letter queue** handling for failed messages
- **Health monitoring** and queue statistics
- **Correlation ID** generation for message tracing

## 🐳 Docker Containerization

### Multi-Environment Docker Setup

Your project implements **three different Docker configurations**:

#### 1. Production (`docker-compose.yml`)
- **Pre-built images** from Docker Hub (`minindu20021116/ecostore-*`)
- **Optimized for deployment** with minimal resource usage
- **Separate MongoDB instances** for each service
- **Network isolation** with custom bridge network

#### 2. Development (`docker-compose.dev.yml`)
- **Hot reloading** with volume mounts
- **Debug ports** exposed (9229-9231)
- **RabbitMQ management UI** accessible
- **Redis caching** for development
- **Environment-specific configurations**

#### 3. Services Only (`docker-compose.services.yml`)
- **Minimal setup** for testing individual services
- **Health checks** for service monitoring
- **Focused on core services** (Order, Payment, Gateway)

### Container Features:
- **Multi-stage builds** for optimized image sizes
- **Health checks** for service availability monitoring
- **Volume persistence** for databases and file storage
- **Network segmentation** for security
- **Graceful shutdown** handling

### Database Per Service Pattern:
Each microservice has its own MongoDB instance:
- `mongo-user` (Port: 27017)
- `mongo-product` (Port: 27017)
- `mongo-cart` (Port: 27017)
- `mongo-order` (Port: 27018)
- `mongo-payment` (Port: 27019)
- `mongo-admin` (Port: 27017)

## 💳 PayPal Integration

### Comprehensive PayPal Implementation

Your payment service includes a **complete PayPal integration** with:

#### PayPal SDK Configuration:
- **Environment-aware**: Sandbox for development, Live for production
- **Secure credential management** via environment variables
- **OAuth2 authentication** with PayPal API

#### Payment Flow:
1. **Order Creation**: Creates PayPal order with purchase units
2. **Payment Authorization**: User completes payment on PayPal
3. **Payment Capture**: Captures authorized payment
4. **Transaction Recording**: Stores payment details in database
5. **Event Publishing**: Notifies other services via RabbitMQ

#### PayPal Features Implemented:
- **OAuth2 Token Management**: Automatic token refresh
- **Order Creation API**: `/v2/checkout/orders`
- **Payment Capture API**: `/v2/checkout/orders/{id}/capture`
- **Error Handling**: Comprehensive error management
- **Transaction Tracking**: Unique transaction ID generation
- **Webhook Support**: Ready for PayPal webhooks

#### PayPal Configuration:
```javascript
PAYPAL_CLIENT_ID: "Your PayPal Client ID"
PAYPAL_CLIENT_SECRET: "Your PayPal Secret"
PAYPAL_MODE: "sandbox" // or "live" for production
PAYPAL_API_BASE: "https://api-m.sandbox.paypal.com" // Sandbox
```

#### Payment Model Schema:
```javascript
{
  user_id: String,
  order_id: String,
  amount: Number,
  currency: String (default: "USD"),
  payment_method: ["paypal", "stripe", "cash_on_delivery"],
  payment_status: ["pending", "completed", "failed", "cancelled"],
  transaction_id: String (unique),
  payment_details: {
    paypal_order_id: String,
    paypal_payer_id: String,
    provider: String
  }
}
```

## 🗄️ Database Architecture

### Database Per Service Pattern

Each microservice maintains its own MongoDB database with:

#### User Service Database:
- **Collections**: users
- **Indexes**: email (unique), username, googleId, role, status
- **Features**: Password hashing, JWT tokens, profile images

#### Product Service Database:
- **Collections**: products
- **Indexes**: category, price, stock, createdBy
- **Features**: Image upload, eco-rating, stock management

#### Cart Service Database:
- **Collections**: carts
- **Indexes**: userId, items.productId
- **Features**: Real-time pricing, shipping calculation

#### Order Service Database:
- **Collections**: orders
- **Indexes**: userId, orderNumber (unique), paymentStatus
- **Features**: Order tracking, status management, payment integration

#### Payment Service Database:
- **Collections**: payments
- **Indexes**: transaction_id (unique), user_id, paypal_order_id
- **Features**: Transaction logging, payment history

#### Admin Service Database:
- **Collections**: admins
- **Features**: Admin authentication, dashboard analytics

### Database Initialization Scripts:
- Automated user creation for each service
- Index optimization for query performance
- Database-specific configurations

## 🔐 Security Implementation

### JWT Authentication System:
- **HTTP-only cookies** for secure token storage
- **Bearer token fallback** for API clients
- **Token verification** across all services
- **Role-based access control** (customer, organizer, admin)

### Security Features:
- **CORS protection** with configurable origins
- **Input validation** on all endpoints
- **Password hashing** with bcrypt
- **Request logging** for audit trails
- **Rate limiting** ready for implementation

## 🌐 API Gateway

### Centralized Routing:
The API Gateway serves as the **single entry point** for all client requests:

- **Service Discovery**: Routes requests to appropriate microservices
- **Load Balancing**: Distributes traffic across service instances
- **Authentication Proxy**: Validates JWT tokens before forwarding
- **CORS Handling**: Centralized CORS configuration
- **Request Logging**: Comprehensive request/response logging

### Gateway Routes:
```
/api/auth/* → User Service (4000)
/api/users/* → User Service (4000)
/api/products/* → Product Service (4001)
/api/cart/* → Cart Service (4002)
/api/orders/* → Order Service (4003)
/api/payments/* → Payment Service (4004)
/api/admin/* → Admin Service (4006)
```

## 🔄 Inter-Service Communication

### Event-Driven Communication:
Services communicate primarily through **RabbitMQ events** rather than direct HTTP calls:

#### Order Processing Flow:
1. **Cart → Order**: Order creation from cart items
2. **Order → Payment**: Payment processing trigger
3. **Payment → Order**: Payment status updates
4. **Order → Product**: Stock updates after successful orders

#### Benefits:
- **Loose coupling** between services
- **Fault tolerance** with retry mechanisms
- **Scalability** through asynchronous processing
- **Event sourcing** capabilities

### Fallback HTTP Communication:
Critical operations still use HTTP for immediate consistency:
- **Authentication verification**
- **Real-time data fetching**
- **Admin operations**

## 🚀 Deployment Strategy

### Multi-Environment Support:

#### Development Environment:
- **Hot reloading** for rapid development
- **Debug ports** for debugging
- **Volume mounts** for live code updates
- **Separate RabbitMQ instance** for isolation

#### Production Environment:
- **Pre-built Docker images** for consistency
- **Optimized resource allocation**
- **Health checks** for monitoring
- **Persistent volumes** for data retention

### Container Orchestration:
- **Docker Compose** for local development
- **Ready for Kubernetes** migration
- **Service dependencies** properly configured
- **Network isolation** for security

## 📊 Monitoring and Observability

### Health Checks:
Each service provides comprehensive health endpoints:
```json
{
  "service": "Service Name",
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "mongodb": "connected",
  "rabbitmq": "connected"
}
```

### Logging Strategy:
- **Structured logging** with correlation IDs
- **Service-specific prefixes** for easy filtering
- **Error tracking** with stack traces
- **Performance metrics** logging

## 🔧 Advanced Features

### File Upload System:
- **Multer integration** for image uploads
- **Profile images** for users
- **Product images** with persistent storage
- **Volume mounting** for file persistence

### Admin Dashboard:
- **User management** with status controls
- **Product management** capabilities
- **Order tracking** and status updates
- **Payment monitoring** and analytics

### Cart Management:
- **Real-time pricing** calculations
- **Shipping cost** management
- **Item validation** against product service
- **Automatic cleanup** for inactive carts

### Order Processing:
- **Unique order numbers** generation
- **Status tracking** through order lifecycle
- **Payment integration** with multiple providers
- **Shipping address** management

## 🛠️ Technology Stack

### Backend Technologies:
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **RabbitMQ** for message queuing
- **JWT** for authentication
- **PayPal SDK** for payment processing
- **Docker** for containerization
- **Multer** for file uploads

### Development Tools:
- **Nodemon** for hot reloading
- **CORS** for cross-origin requests
- **Cookie Parser** for session management
- **Bcrypt** for password hashing
- **Axios** for HTTP requests

## 🔄 Event-Driven Patterns

### Publisher-Subscriber Pattern:
Services publish events when state changes occur and subscribe to events they need to react to.

### Event Sourcing:
All significant business events are captured and stored, providing:
- **Audit trails** for compliance
- **Replay capabilities** for debugging
- **Analytics data** for business insights

### Saga Pattern:
Complex transactions span multiple services using event choreography:
- **Order Creation Saga**: Cart → Order → Payment → Fulfillment
- **Payment Processing Saga**: Order → Payment → Notification → Completion

## 📈 Scalability Features

### Horizontal Scaling:
- **Stateless services** for easy replication
- **Load balancing** through API Gateway
- **Database sharding** ready architecture
- **Message queue** distribution

### Performance Optimizations:
- **Database indexing** for fast queries
- **Connection pooling** for database efficiency
- **Caching strategy** with Redis (development)
- **Async processing** for non-blocking operations

## 🔒 Security Best Practices

### Authentication & Authorization:
- **JWT tokens** with secure HTTP-only cookies
- **Role-based access control** (RBAC)
- **Token expiration** and refresh mechanisms
- **Cross-service authentication** propagation

### Data Protection:
- **Password hashing** with bcrypt
- **Environment variable** configuration
- **CORS protection** with whitelist
- **Input validation** and sanitization

## 🚀 Deployment Architecture

### Container Strategy:
- **Microservice per container** for isolation
- **Shared network** for inter-service communication
- **Volume persistence** for data and files
- **Health monitoring** for service availability

### Environment Management:
- **Development**: Hot reloading with debug capabilities
- **Production**: Optimized images with health checks
- **Testing**: Isolated services for integration testing

## 📊 Monitoring and Analytics

### Service Health:
- **Real-time health checks** for all services
- **Database connectivity** monitoring
- **RabbitMQ connection** status tracking
- **Payment gateway** availability checks

### Business Metrics:
- **Order statistics** and trends
- **Payment success rates**
- **Cart abandonment** tracking
- **User activity** analytics

## 🔧 Configuration Management

### Environment Variables:
Each service is configured through environment variables for:
- **Database connections**
- **Service URLs**
- **Authentication secrets**
- **Payment provider credentials**
- **RabbitMQ settings**

### Service Discovery:
Services communicate using:
- **Environment-based URLs** for flexibility
- **Docker network names** for container communication
- **Health check endpoints** for availability verification

## 🎯 Key Achievements

### 1. **Microservices Architecture**
- ✅ Complete service separation with independent databases
- ✅ API Gateway for centralized routing
- ✅ Inter-service communication via events and HTTP

### 2. **RabbitMQ Event System**
- ✅ Topic-based message routing
- ✅ Automatic retry with dead letter queues
- ✅ Event correlation and tracing
- ✅ Graceful error handling and recovery

### 3. **PayPal Payment Integration**
- ✅ Complete PayPal Checkout API integration
- ✅ OAuth2 authentication with PayPal
- ✅ Order creation and payment capture
- ✅ Transaction recording and history

### 4. **Docker Containerization**
- ✅ Multi-environment Docker configurations
- ✅ Container orchestration with Docker Compose
- ✅ Volume persistence for data and files
- ✅ Network isolation and service discovery

### 5. **Database Architecture**
- ✅ Database per service pattern
- ✅ Automated initialization scripts
- ✅ Optimized indexing strategies
- ✅ Data consistency across services

### 6. **Security Implementation**
- ✅ JWT-based authentication system
- ✅ Role-based access control
- ✅ Secure password handling
- ✅ CORS protection and input validation

### 7. **Admin Dashboard**
- ✅ Comprehensive admin service
- ✅ User and product management
- ✅ Order tracking and analytics
- ✅ Payment monitoring capabilities

## 🔄 Service Communication Patterns

### Synchronous Communication:
- **API Gateway → Services**: Direct HTTP routing
- **Authentication verification**: Real-time token validation
- **Admin operations**: Immediate data consistency required

### Asynchronous Communication:
- **Order processing**: Event-driven workflow
- **Payment notifications**: Decoupled payment updates
- **Stock updates**: Eventually consistent inventory
- **User notifications**: Non-blocking messaging

## 📦 Package Management

### Shared Dependencies:
- **Common utilities** in `backend/shared/`
- **RabbitMQ manager** shared across services
- **Consistent package versions** across services

### Service-Specific Dependencies:
- **PayPal SDK** in payment service
- **Multer** for file uploads
- **Mongoose** for MongoDB integration
- **Express** framework for all services

## 🎉 Business Logic Implementation

### E-Commerce Workflow:
1. **User Registration/Login** → JWT token generation
2. **Product Browsing** → Catalog with filtering and search
3. **Cart Management** → Real-time cart updates with pricing
4. **Order Creation** → Cart conversion to order
5. **Payment Processing** → PayPal integration with capture
6. **Order Fulfillment** → Status tracking and updates

### Advanced Features:
- **Eco-rating system** for sustainable products
- **Carbon footprint tracking**
- **Multi-role user system** (customer, organizer, admin)
- **Order number generation** with unique identifiers
- **Payment history** and transaction tracking

## 🚀 Deployment Ready Features

### Production Considerations:
- **Environment variable** configuration
- **Docker image** optimization
- **Health monitoring** endpoints
- **Graceful shutdown** handling
- **Error logging** and monitoring

### Scalability Preparations:
- **Stateless service design**
- **Database connection pooling**
- **Message queue** for async processing
- **Load balancer** ready architecture

---

## 📋 Summary

This microservices backend represents a **production-ready e-commerce platform** with:

- **7 independent microservices** with clear responsibilities
- **Event-driven architecture** using RabbitMQ for loose coupling
- **Complete PayPal payment integration** with OAuth2 and transaction management
- **Multi-environment Docker setup** for development and production
- **Comprehensive security** with JWT authentication and RBAC
- **Database per service** pattern with optimized indexing
- **Admin dashboard** for complete system management
- **Monitoring and health checks** for operational excellence

The architecture demonstrates **enterprise-level patterns** including event sourcing, saga patterns, circuit breakers, and microservice best practices. The system is designed for **high availability, scalability, and maintainability** with proper separation of concerns and fault tolerance.
