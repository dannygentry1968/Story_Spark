#!/bin/bash

# StorySpark v3 - Deployment Script for Hostinger VPS with Docker
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT="${1:-production}"
IMAGE_NAME="storyspark"
CONTAINER_NAME="storyspark"

echo "🚀 StorySpark v3 Deployment"
echo "Environment: $ENVIRONMENT"
echo "================================"

# Check for required environment variables
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  Warning: ANTHROPIC_API_KEY not set"
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY not set"
fi

# Pull latest code (if using git)
if [ -d ".git" ]; then
    echo "📥 Pulling latest code..."
    git pull origin main
fi

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t $IMAGE_NAME:latest .

# Stop existing container if running
echo "🛑 Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Run the new container
echo "▶️  Starting new container..."
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p 3000:3000 \
    -e NODE_ENV=production \
    -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
    -e OPENAI_API_KEY="$OPENAI_API_KEY" \
    -v storyspark-data:/app/data \
    $IMAGE_NAME:latest

# Wait for health check
echo "⏳ Waiting for health check..."
sleep 5

# Check if container is healthy
if docker ps | grep -q $CONTAINER_NAME; then
    echo "✅ Deployment successful!"
    echo ""
    echo "Container status:"
    docker ps --filter name=$CONTAINER_NAME
    echo ""
    echo "View logs: docker logs -f $CONTAINER_NAME"
else
    echo "❌ Deployment failed. Check logs:"
    docker logs $CONTAINER_NAME
    exit 1
fi
