# StorySpark v3 - Production Dockerfile
# Multi-stage build for optimal image size

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for better-sqlite3 and sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev

# Create non-root user
RUN addgroup -g 1001 -S storyspark && \
    adduser -S storyspark -u 1001

# Copy built application
COPY --from=builder --chown=storyspark:storyspark /app/build ./build
COPY --from=builder --chown=storyspark:storyspark /app/node_modules ./node_modules
COPY --from=builder --chown=storyspark:storyspark /app/package.json ./

# Create data directories
RUN mkdir -p data/storage && \
    chown -R storyspark:storyspark data

# Switch to non-root user
USER storyspark

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_URL=file:./data/storyspark.db
ENV STORAGE_PATH=./data/storage

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "build"]
