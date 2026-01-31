# StorySpark Deployment Guide

Deploy StorySpark to your Hostinger VPS using Docker.

## Prerequisites

- Hostinger VPS with Docker installed
- SSH access to your server
- Domain name (optional but recommended)
- API keys for Claude (Anthropic) and OpenAI

## Quick Start

### 1. Clone the Repository

```bash
ssh user@your-server-ip
cd /opt
git clone https://github.com/dannygentry1968/Story_Spark.git storyspark
cd storyspark
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your values
nano .env
```

**Required settings:**
```env
ORIGIN=https://your-domain.com
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
OPENAI_API_KEY=sk-xxxxx
```

### 3. Build and Run

```bash
# Build and start the container
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Verify Deployment

```bash
# Check health endpoint
curl http://localhost:3000/api/health
```

## Nginx Reverse Proxy (Recommended)

If using Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name storyspark.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name storyspark.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/storyspark.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/storyspark.yourdomain.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## SSL with Let's Encrypt

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d storyspark.yourdomain.com
```

## Management Commands

```bash
# Stop the application
docker-compose down

# Restart the application
docker-compose restart

# Update to latest version
git pull
docker-compose up -d --build

# View logs
docker-compose logs -f storyspark

# Access container shell
docker-compose exec storyspark sh

# Check resource usage
docker stats storyspark
```

## Data Persistence

Data is stored in Docker volumes:
- `storyspark-data` - SQLite database
- `storyspark-uploads` - User uploaded files
- `storyspark-exports` - Generated PDF exports

**Backup data:**
```bash
# Create backup directory
mkdir -p /backups/storyspark

# Backup database
docker cp storyspark:/app/data/storyspark.db /backups/storyspark/

# Backup all volumes
docker run --rm -v storyspark-data:/data -v /backups:/backup alpine tar czf /backup/storyspark-data.tar.gz -C /data .
docker run --rm -v storyspark-uploads:/data -v /backups:/backup alpine tar czf /backup/storyspark-uploads.tar.gz -C /data .
docker run --rm -v storyspark-exports:/data -v /backups:/backup alpine tar czf /backup/storyspark-exports.tar.gz -C /data .
```

**Restore data:**
```bash
docker run --rm -v storyspark-data:/data -v /backups:/backup alpine sh -c "cd /data && tar xzf /backup/storyspark-data.tar.gz"
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs storyspark

# Check container status
docker-compose ps
```

### Database issues
```bash
# Access container and check database
docker-compose exec storyspark sh
ls -la /app/data/
```

### Memory issues
Edit `docker-compose.yml` to add resource limits:
```yaml
services:
  storyspark:
    # ... other config
    deploy:
      resources:
        limits:
          memory: 1G
```

### Port conflicts
Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # Change 3000 to your preferred port
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `3000` |
| `ORIGIN` | Your domain URL | Required |
| `ANTHROPIC_API_KEY` | Claude API key | Required |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `DATABASE_PATH` | Database file path | `/app/data/storyspark.db` |
| `UPLOADS_PATH` | Uploads directory | `/app/uploads` |
| `EXPORTS_PATH` | Exports directory | `/app/exports` |
| `BODY_SIZE_LIMIT` | Max upload size | `52428800` (50MB) |

## Updating

```bash
cd /opt/storyspark
git pull origin main
docker-compose down
docker-compose up -d --build
```

## Support

For issues, check:
1. Docker logs: `docker-compose logs -f`
2. Health endpoint: `curl localhost:3000/api/health`
3. Container status: `docker-compose ps`
