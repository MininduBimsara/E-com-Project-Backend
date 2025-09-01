FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy shared utilities
COPY shared/ ./shared/

# Copy service package files with correct path
COPY services/cart-service/package*.json ./

# Install dependencies
RUN npm install --production && \
    npm cache clean --force

# Copy service application code
COPY services/cart-service/ .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4002

CMD ["npm", "start"]