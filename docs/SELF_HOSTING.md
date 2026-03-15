# Self-Hosting Walcache/WCDN

Run your own WCDN instance for full control over your CDN infrastructure with no third-party dependencies.

## Prerequisites

- **Bun** >= 1.0 (or Node.js >= 20)
- **Redis** >= 7.0 (optional but recommended for production)
- **Git**

## Quick Start

```bash
# Clone the repository
git clone https://github.com/whereissam/Walcache.git
cd Walcache

# Install dependencies
bun install

# Create environment file
cp .env.example .env

# Start the server
cd cdn-server && bun dev
```

The server will be available at `http://localhost:4500`.

## Environment Configuration

Create a `.env` file in the project root:

```env
# Required
API_KEY_SECRET=your-secret-key-minimum-32-characters-long

# Server
PORT=4500
HOST=0.0.0.0
NODE_ENV=production

# Walrus Network
WALRUS_NETWORK=mainnet                  # or "testnet"
WALRUS_EPOCH_DURATION=86400             # seconds (default: 24h)

# Redis (recommended for production)
REDIS_URL=redis://localhost:6379

# Cache
CACHE_TTL=3600                          # default TTL in seconds
MAX_CACHE_SIZE=10000                    # max cached items

# Cache Persistence (survives restarts)
ENABLE_CACHE_PERSISTENCE=true
CACHE_PERSISTENCE_DIR=/var/lib/wcdn/cache

# IPFS Fallback
ENABLE_IPFS_FALLBACK=true
IPFS_GATEWAY=https://ipfs.io/ipfs/

# Tusky Integration (optional, for upload management)
TUSKY_API_URL=https://api.tusky.io
TUSKY_API_KEY=your-tusky-api-key

# Webhooks (optional)
WEBHOOK_SECRET=your-webhook-secret-minimum-32-characters
WEBHOOK_URL=https://your-app.com/webhooks

# Seal Encryption (optional)
ENABLE_SEAL=true

# Monitoring
ENABLE_ANALYTICS=true
ENABLE_METRICS=true
```

## Production Deployment

### With Docker

```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lockb ./
COPY cdn-server/package.json cdn-server/
RUN bun install --frozen-lockfile

COPY cdn-server/ cdn-server/
RUN cd cdn-server && bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/cdn-server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/cdn-server/package.json ./

# Create persistence directory
RUN mkdir -p /var/lib/wcdn/cache

EXPOSE 4500
CMD ["bun", "run", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  wcdn:
    build: .
    ports:
      - "4500:4500"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - API_KEY_SECRET=${API_KEY_SECRET}
      - WALRUS_NETWORK=mainnet
      - ENABLE_CACHE_PERSISTENCE=true
      - CACHE_PERSISTENCE_DIR=/var/lib/wcdn/cache
    volumes:
      - cache-data:/var/lib/wcdn/cache
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  cache-data:
  redis-data:
```

### With systemd

```ini
[Unit]
Description=WCDN - Walrus Content Delivery Network
After=network.target redis.service

[Service]
Type=simple
User=wcdn
Group=wcdn
WorkingDirectory=/opt/wcdn
ExecStart=/usr/local/bin/bun run start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Architecture Notes

### Cache Layers

WCDN uses a three-tier cache strategy:

1. **Memory Cache** (NodeCache) - fastest, limited by RAM
2. **Redis** - shared across processes, survives restarts
3. **Disk Persistence** - for pinned/high-value blobs, survives Redis failures

### Epoch-Aware Caching

Cache TTLs automatically align with Walrus storage epochs. This ensures cached content doesn't outlive its availability on the Walrus network. Configure with `WALRUS_EPOCH_DURATION`.

### Aggregator Failover

WCDN monitors all Walrus aggregator endpoints every 5 minutes and routes requests to the fastest healthy aggregator. If all aggregators fail, it falls back to IPFS (if enabled).

## API Endpoints

Once running, key endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /cdn/:cid` | Serve Walrus content |
| `GET /api/health/endpoints` | Aggregator health status |
| `GET /api/pricing` | Subscription plans |
| `GET /api/metrics` | CDN metrics (auth required) |
| `POST /api/preload` | Preload CIDs (auth required) |
| `POST /api/pin/:cid` | Pin content (auth required) |
| `POST /upload/file` | Upload file (auth required) |

Full API docs available at `/documentation` when the server is running.

## Security Checklist

- [ ] Set a strong `API_KEY_SECRET` (minimum 32 characters)
- [ ] Set a strong `WEBHOOK_SECRET` if using webhooks
- [ ] Run behind a reverse proxy (nginx/Caddy) with TLS
- [ ] Configure `ALLOWED_ORIGINS` for CORS in production
- [ ] Use Redis AUTH in production (`redis://:password@host:6379`)
- [ ] Set appropriate rate limits for your use case
- [ ] Monitor `/api/health/endpoints` for aggregator health

## Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name cdn.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/cdn.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cdn.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4500;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache headers for CDN content
        proxy_cache_valid 200 1h;
        proxy_buffering on;
    }
}
```

## Monitoring

### Prometheus

Scrape metrics from `GET /api/metrics/prometheus` (requires auth).

### Health Checks

- Server health: `GET /health`
- Aggregator health: `GET /api/health/endpoints`
- Cache stats: `GET /api/cache/stats` (requires auth)

### Alerts to Configure

- Aggregator healthy count drops below 2
- Cache hit rate drops below 80%
- Redis connection lost (server falls back to memory-only)
- Disk persistence directory usage exceeds 80%

## Upgrading

```bash
git pull origin main
bun install
cd cdn-server && bun run build
# Restart the service
systemctl restart wcdn
```

Pinned blobs survive restarts via the persistence layer. Redis cache may be cold after restart but will warm up with traffic.
