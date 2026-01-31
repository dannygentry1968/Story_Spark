#!/bin/bash
# StorySpark Deployment Script
# Usage: ./deploy.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env exists
check_env() {
    if [ ! -f .env ]; then
        log_error ".env file not found!"
        log_info "Creating from .env.example..."
        cp .env.example .env
        log_warn "Please edit .env with your API keys and domain before deploying."
        exit 1
    fi
}

# Deploy command
deploy() {
    log_info "Starting StorySpark deployment..."
    check_env
    
    log_info "Building Docker image..."
    docker-compose build
    
    log_info "Starting containers..."
    docker-compose up -d
    
    log_info "Waiting for health check..."
    sleep 5
    
    if curl -s http://localhost:3000/api/health > /dev/null; then
        log_info "✅ StorySpark is running!"
        log_info "Access at: http://localhost:3000"
    else
        log_error "Health check failed. Check logs with: docker-compose logs"
        exit 1
    fi
}

# Update command
update() {
    log_info "Updating StorySpark..."
    
    log_info "Pulling latest changes..."
    git pull origin main
    
    log_info "Rebuilding containers..."
    docker-compose down
    docker-compose up -d --build
    
    log_info "✅ Update complete!"
}

# Stop command
stop() {
    log_info "Stopping StorySpark..."
    docker-compose down
    log_info "✅ Stopped"
}

# Restart command
restart() {
    log_info "Restarting StorySpark..."
    docker-compose restart
    log_info "✅ Restarted"
}

# Logs command
logs() {
    docker-compose logs -f storyspark
}

# Status command
status() {
    docker-compose ps
    echo ""
    log_info "Health check:"
    curl -s http://localhost:3000/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/api/health
}

# Backup command
backup() {
    BACKUP_DIR="${1:-/backups/storyspark}"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    log_info "Creating backup in $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    
    docker run --rm \
        -v storyspark-data:/data \
        -v "$BACKUP_DIR":/backup \
        alpine tar czf "/backup/storyspark-backup-$TIMESTAMP.tar.gz" -C /data .
    
    log_info "✅ Backup created: $BACKUP_DIR/storyspark-backup-$TIMESTAMP.tar.gz"
}

# Help command
help() {
    echo "StorySpark Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  deploy    Build and start the application"
    echo "  update    Pull latest changes and rebuild"
    echo "  stop      Stop the application"
    echo "  restart   Restart the application"
    echo "  logs      View application logs"
    echo "  status    Show container status and health"
    echo "  backup    Create a backup of the database"
    echo "  help      Show this help message"
}

# Main
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    update)
        update
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    backup)
        backup "$2"
        ;;
    help|--help|-h)
        help
        ;;
    *)
        log_error "Unknown command: $1"
        help
        exit 1
        ;;
esac
