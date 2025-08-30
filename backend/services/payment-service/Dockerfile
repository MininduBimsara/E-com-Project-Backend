# Payment Service Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy shared utilities
COPY --chown=node:node ../../shared ./shared

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S paymentservice -u 1001

# Change ownership of the app directory
RUN chown -R paymentservice:nodejs /app
USER paymentservice

# Expose port
EXPOSE 4004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]