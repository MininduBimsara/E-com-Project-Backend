FROM node:18-alpine

WORKDIR /app

# Copy shared utilities first (from backend context)
COPY shared/ ./shared/

# Install system dependencies (if needed)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY services/payment-service/package*.json ./

# Install dependencies - use npm install instead of npm ci
RUN npm install --production && npm cache clean --force

# Copy application code
COPY services/payment-service/ .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S paymentservice -u 1001 && \
    chown -R paymentservice:nodejs /app

USER paymentservice

EXPOSE 4004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4004/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]