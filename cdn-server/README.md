# WCDN Backend Server

High-performance CDN backend for Walrus Content Delivery Network, providing intelligent caching, file upload via Tusky.io, and analytics tracking.

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Set up environment variables
cp ../.env.example .env
# Edit .env with your API keys

# Start development server
bun dev

# Production build and start
bun run build
bun start
```

## 📋 Prerequisites

- **Bun** runtime (latest version)
- **Redis** server (for caching)
- **Tusky.io API key** (for file uploads)

## 🌍 Environment Variables

Create a `.env` file in the project root:

```env
# Required
TUSKY_API_KEY=your_tusky_api_key_here
TUSKY_API_URL=https://api.tusky.io

# Optional
PORT=4500
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

## 🛠️ Development

```bash
# Development with hot reload
bun dev

# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run format
```

## 📡 API Endpoints

### CDN Routes
- `GET /cdn/:cid` - Serve cached Walrus content
- `GET /api/stats/:cid` - Get analytics for specific CID
- `GET /api/metrics` - Global CDN metrics

### Upload Routes
- `POST /upload/file` - Upload file to Walrus via Tusky.io
- `POST /upload/walrus` - Direct upload to Walrus network
- `GET /upload/vaults` - List Tusky.io vaults
- `GET /upload/files` - List files in vault
- `DELETE /upload/files/:id` - Delete file from vault

### Cache Management
- `POST /api/preload` - Preload CIDs into cache
- `POST /api/pin/:cid` - Pin CID to prevent eviction
- `DELETE /api/pin/:cid` - Unpin CID
- `POST /api/cache/clear` - Clear entire cache
- `GET /api/cache/stats` - Get cache statistics

### Health & Monitoring
- `GET /health` - Server health check
- `GET /upload/health` - Upload service health check

## 🏗️ Architecture

### Core Services

#### Cache Service (`/services/cache.ts`)
- **Redis + Memory** dual-layer caching
- **TTL management** with configurable expiration
- **Hit/miss tracking** for analytics
- **LRU eviction** with pinning support

#### Walrus Service (`/services/walrus.ts`)
- **Multi-endpoint** support with health checking
- **Automatic failover** between aggregators
- **Content retrieval** with retry logic
- **Blob verification** across networks

#### Tusky Service (`/services/tusky.ts`)
- **File upload** to Walrus via Tusky.io API
- **Vault management** (create, list, manage)
- **File operations** (upload, list, delete)
- **Multi-chain support** for different networks

#### Analytics Service (`/services/analytics.ts`)
- **Request tracking** (hits, misses, latency)
- **Performance metrics** aggregation
- **Cache efficiency** monitoring
- **Top content** identification

### Middleware

#### Authentication (`/middleware/auth.ts`)
- **API key validation** for protected endpoints
- **Rate limiting** per API key
- **Request logging** and audit trail

### Configuration

#### Main Config (`/config/index.ts`)
- **Zod validation** for environment variables
- **Type-safe configuration** management
- **Default values** and validation rules

#### Walrus Endpoints (`/config/walrus-endpoints.ts`)
- **Endpoint health monitoring** 
- **Automatic failover** configuration
- **Load balancing** across aggregators

## 📊 Monitoring & Analytics

### Cache Metrics
- **Hit Rate**: Percentage of requests served from cache
- **Memory Usage**: Redis and local memory consumption
- **Key Count**: Number of cached items
- **Eviction Rate**: How often items are removed

### Performance Metrics
- **Request Latency**: Average response times
- **Upload Success Rate**: File upload reliability
- **Endpoint Health**: Walrus aggregator status
- **Error Rates**: Failed requests by type

### Access via API
```bash
# Global metrics
curl http://localhost:4500/api/metrics

# Specific CID stats
curl http://localhost:4500/api/stats/your_cid_here

# Cache statistics
curl http://localhost:4500/api/cache/stats
```

## 🔧 Configuration Options

### Cache Configuration
```typescript
// Adjust in /config/index.ts
cache: {
  ttl: 3600,           // Default TTL in seconds
  maxMemoryKeys: 1000, // Max items in memory cache
  redisUrl: process.env.REDIS_URL
}
```

### Upload Configuration
```typescript
// Tusky.io settings
tusky: {
  apiKey: process.env.TUSKY_API_KEY,
  apiUrl: process.env.TUSKY_API_URL,
  timeout: 30000 // Request timeout
}
```

### Walrus Configuration
```typescript
// Aggregator endpoints
walrus: {
  endpoints: [
    'https://aggregator.walrus-testnet.walrus.space',
    'https://aggregator.testnet.walrus.atalma.io'
  ],
  healthCheckInterval: 30000 // Health check frequency
}
```

## 🐳 Docker Deployment

```bash
# Build Docker image
docker build -t wcdn-server .

# Run with environment variables
docker run -p 4500:4500 \
  -e TUSKY_API_KEY=your_key \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  wcdn-server
```

## 🚨 Troubleshooting

### Common Issues

#### Redis Connection Failed
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis (macOS)
brew services start redis

# Start Redis (Linux)
sudo systemctl start redis
```

#### Tusky.io API Errors
```bash
# Verify API key
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.tusky.io/vaults

# Check TUSKY_API_KEY in .env file
```

#### CORS Issues
- The server includes CORS headers for frontend access
- If issues persist, check `Access-Control-Allow-Origin` settings

#### Upload Failures
- Verify file size limits (default: 10MB)
- Check network connectivity to Walrus endpoints
- Monitor logs for specific error messages

### Debug Mode
```bash
# Enable verbose logging
NODE_ENV=development bun dev

# Check logs
tail -f logs/wcdn.log
```

## 🔒 Security

### API Key Management
- Use strong, unique API keys
- Rotate keys regularly
- Never commit keys to version control

### Rate Limiting
- Default: 100 requests per minute per API key
- Configurable per endpoint
- Automatic IP-based blocking for abuse

### Input Validation
- All inputs validated with Zod schemas
- File type and size restrictions
- Sanitized error messages

## 📈 Performance Optimization

### Cache Optimization
- **Monitor hit rates** - Aim for >70% cache hit rate
- **Tune TTL values** - Balance freshness vs performance  
- **Pin frequently accessed content** - Prevent important content eviction

### Upload Optimization
- **Use appropriate file sizes** - Compress large files before upload
- **Batch operations** - Group multiple uploads when possible
- **Monitor endpoint health** - Switch aggregators if performance degrades

## 🤝 Contributing

1. **Code Style**: Follow existing TypeScript patterns
2. **Testing**: Add tests for new features
3. **Documentation**: Update README for new endpoints
4. **Error Handling**: Use consistent error response format

## 📄 License

This project is part of the WCDN system. See main project LICENSE for details.

## 🆘 Support

- **Issues**: Create GitHub issue with logs and reproduction steps
- **Documentation**: Check main project README.md
- **API Reference**: See `/docs` directory for OpenAPI specs