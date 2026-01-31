# StorySpark Dockerfile
# Multi-stage build for smaller production image

# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:20-alpine AS builder

# Install build dependencies for native modules (better-sqlite3, sharp)
RUN apk add --no-cache python3 make g++ gcc libc-dev linux-headers

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build the SvelteKit application
RUN npm run build

# Remove dev dependencies for smaller image
RUN npm prune --production

# ============================================================================
# Stage 2: Production
# ============================================================================
FROM node:20-alpine AS production

# Install runtime dependencies for native modules
RUN apk add --no-cache \
    libc6-compat \
    libstdc++ \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S storyspark && \
    adduser -S storyspark -u 1001

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=storyspark:storyspark /app/build ./build
COPY --from=builder --chown=storyspark:storyspark /app/node_modules ./node_modules
COPY --from=builder --chown=storyspark:storyspark /app/package.json ./

# Create directories for data persistence
RUN mkdir -p /app/data /app/uploads /app/exports && \
    chown -R storyspark:storyspark /app/data /app/uploads /app/exports

# Switch to non-root user
USER storyspark

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV ORIGIN=http://localhost:3000
ENV BODY_SIZE_LIMIT=52428800

# Database and storage paths
ENV DATABASE_PATH=/app/data/storyspark.db
ENV UPLOADS_PATH=/app/uploads
ENV EXPORTS_PATH=/app/exports

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "build"]
