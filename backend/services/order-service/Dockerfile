# Order Service Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy shared utilities first (from backend context)
COPY shared/ ./shared/

# Copy package files
COPY services/order-service/package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY services/order-service/ .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S orderservice -u 1001 && \
    chown -R orderservice:nodejs /app

USER orderservice

# Expose port
EXPOSE 4003

# Start the application
CMD ["npm", "start"]