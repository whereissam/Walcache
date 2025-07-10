# WCDN Backend Server

Enterprise-grade CDN backend for Walrus Content Delivery Network with advanced optimizations including dependency injection, circuit breakers, concurrent connection management, comprehensive security, and real-time monitoring.

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

### 👤 User Management & Authentication

#### User Registration & Login

- `POST /users/register` - Register new user account
- `POST /users/login` - User authentication
- `GET /users/profile` - Get user profile information
- `GET /users/dashboard` - Complete user dashboard with usage stats

#### Subscription Management

- `GET /users/plans` - List available subscription plans
- `PUT /users/subscription` - Update user subscription tier

#### API Token Management

- `POST /users/tokens` - Create new API token with permissions
- `GET /users/tokens` - List user's API tokens
- `GET /users/tokens/:tokenId/usage` - Get token usage statistics
- `DELETE /users/tokens/:tokenId` - Revoke API token

### 🔒 CDN Routes (Requires API Token)

- `GET /cdn/:cid` - Serve cached Walrus content
- `GET /api/stats/:cid` - Get analytics for specific CID
- `GET /api/metrics` - Global CDN metrics

### 📤 Upload Routes (Requires API Token)

- `POST /upload/file` - Upload file to Walrus via Tusky.io
- `POST /upload/walrus` - Direct upload to Walrus network
- `GET /upload/vaults` - List Tusky.io vaults
- `GET /upload/files` - List files in vault
- `DELETE /upload/files/:id` - Delete file from vault

### 🗄️ Cache Management (Requires Admin Permission)

- `POST /api/preload` - Preload CIDs into cache
- `POST /api/pin/:cid` - Pin CID to prevent eviction
- `DELETE /api/pin/:cid` - Unpin CID
- `POST /api/cache/clear` - Clear entire cache
- `GET /api/cache/stats` - Get cache statistics

### 📊 Health & Monitoring

- `GET /health` - Server health check
- `GET /upload/health` - Upload service health check

## 🏗️ Architecture

### 🔧 Core Optimizations

#### 1. Dependency Injection System (`/container/service-container.ts`)

- **IoC Container** for loose coupling and better testability
- **Service lifecycle management** with automatic initialization
- **Circular dependency detection** and resolution
- **Graceful shutdown** with proper resource cleanup

#### 2. Advanced Error Handling (`/errors/base-error.ts`)

- **Structured error types** with correlation IDs
- **Circuit breaker pattern** for external service resilience
- **Automatic failover** with health-based routing
- **Comprehensive error context** for debugging

#### 3. Concurrent Connection Management (`/middleware/connection-manager.ts`)

- **Connection pooling** with configurable limits
- **Per-IP concurrent limits** to prevent abuse
- **Request queuing** when pool is exhausted
- **Real-time connection monitoring** and metrics

#### 4. Enhanced Security (`/middleware/security.ts`)

- **DDoS protection** with IP blocking
- **Brute force prevention** with exponential backoff
- **CSRF protection** for state-changing operations
- **Request signing** validation for sensitive endpoints

#### 5. Comprehensive Monitoring (`/services/metrics.ts`)

- **System metrics** (CPU, memory, event loop lag)
- **Application metrics** with histogram support
- **Prometheus export** for monitoring integration
- **Real-time performance tracking**

### Core Services

#### User Service (`/services/user.ts`)

- **User registration** and authentication with bcrypt
- **Subscription management** with tiered pricing
- **API token generation** with secure hashing
- **Usage tracking** and billing integration
- **Permission-based access control**

#### Cache Service (`/services/cache.ts`)

- **Enhanced Redis pooling** with keep-alive optimization
- **Intelligent cache warming** with batch processing
- **Memory pressure monitoring** and proactive eviction
- **Cache preloading** for popular content
- **Connection pooling** with automatic reconnection

#### Walrus Service (`/services/walrus.ts`)

- **Circuit breaker protection** for endpoint failures
- **Parallel request processing** for improved performance
- **Health-based load balancing** across aggregators
- **Automatic retry** with exponential backoff
- **Connection pooling** with keep-alive

#### Analytics Service (`/services/analytics.ts`)

- **Real-time metrics collection** with sliding windows
- **Memory-efficient** event storage with automatic cleanup
- **Geographic analytics** with IP-based routing
- **Performance correlation** analysis

#### Endpoint Health Service (`/services/endpoint-health.ts`)

- **Continuous health monitoring** with detailed metrics
- **Response time tracking** and performance scoring
- **Automatic failover** based on health scores
- **Detailed health reports** with failure analysis

### Advanced Middleware

#### Enhanced Authentication (`/middleware/auth.ts`)

- **Token-based authentication** with subscription validation
- **Permission-based access control** for fine-grained security
- **Usage tracking** and automatic limit enforcement
- **Legacy system compatibility** for smooth transition

#### Connection Manager (`/middleware/connection-manager.ts`)

- **Concurrent connection limits** (global and per-IP)
- **Connection queuing** with timeout handling
- **Real-time connection tracking** and statistics
- **Graceful shutdown** with connection draining

#### Security Middleware (`/middleware/security.ts`)

- **Multi-layer protection** (DDoS, brute force, rate limiting)
- **IP whitelisting/blacklisting** support
- **Request signature validation** for admin operations
- **CSRF token management** with session tracking

#### Error Handler (`/middleware/error-handler.ts`)

- **Structured error responses** with correlation IDs
- **Sensitive data sanitization** in error logs
- **Request context preservation** for debugging
- **Automatic error reporting** and alerting

### Configuration

#### Environment-Based Configuration (`/config/config-loader.ts`)

- **Environment separation** (development, staging, production, test)
- **Structured configuration** with type safety
- **Environment variable overrides** with validation
- **Secrets management** with proper isolation

#### Legacy Config Support (`/config/index.ts`)

- **Backward compatibility** for existing integrations
- **Automatic migration** to new config system
- **Zod validation** for environment variables

#### Walrus Endpoints (`/config/walrus-endpoints.ts`)

- **Multi-network support** (testnet, mainnet)
- **Endpoint health monitoring** with failover
- **Load balancing** across aggregators

## 💳 Paid Functions & API Token System

### 🎯 Subscription Plans

#### Free Tier

- **Cost**: $0/month
- **Rate Limit**: 10 requests/minute
- **Daily Limit**: 1,000 requests
- **Monthly Limit**: 10,000 requests
- **Bandwidth**: 1GB/month
- **Features**: Basic CDN access, file uploads, basic analytics

#### Starter Plan

- **Cost**: $29/month
- **Rate Limit**: 100 requests/minute
- **Daily Limit**: 50,000 requests
- **Monthly Limit**: 1,000,000 requests
- **Bandwidth**: 10GB/month
- **Features**: Enhanced CDN, cache management, advanced analytics

#### Professional Plan

- **Cost**: $99/month
- **Rate Limit**: 1,000 requests/minute
- **Daily Limit**: 1,000,000 requests
- **Monthly Limit**: 10,000,000 requests
- **Bandwidth**: 100GB/month
- **Features**: Full CDN access, advanced cache management, webhooks

#### Enterprise Plan

- **Cost**: $299/month
- **Rate Limit**: 10,000 requests/minute
- **Daily Limit**: 10,000,000 requests
- **Monthly Limit**: 100,000,000 requests
- **Bandwidth**: 1TB/month
- **Features**: Unlimited access, enterprise cache, custom analytics

### 🔑 API Token Management

#### Creating API Tokens

```bash
# Register user account
curl -X POST http://localhost:4500/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "myuser",
    "password": "securepassword123",
    "subscriptionTier": "starter"
  }'

# Login to get access
curl -X POST http://localhost:4500/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'

# Create API token
curl -X POST http://localhost:4500/users/tokens \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_session_token" \
  -d '{
    "name": "My CDN Token",
    "permissions": ["READ_CDN", "UPLOAD_FILES"],
    "expiresAt": "2024-12-31T23:59:59Z"
  }'
```

#### Using API Tokens

```bash
# Use token for CDN access
curl -H "X-API-Key: wcdn_your_generated_token_here" \
  http://localhost:4500/cdn/your_cid_here

# Upload file with token
curl -X POST http://localhost:4500/upload/file \
  -H "X-API-Key: wcdn_your_generated_token_here" \
  -F "file=@myfile.jpg"

# Check token usage
curl -H "X-API-Key: your_session_token" \
  http://localhost:4500/users/tokens/token_id/usage
```

### 🔐 Permissions System

#### Available Permissions

- **READ_CDN**: Access CDN content retrieval
- **WRITE_CDN**: Modify CDN configurations
- **UPLOAD_FILES**: Upload files to Walrus
- **MANAGE_CACHE**: Control cache operations
- **VIEW_ANALYTICS**: Access analytics data
- **ADMIN**: Full administrative access

#### Permission-Based Access

```typescript
// Token permissions are automatically enforced
// Users can only access endpoints they have permission for
const tokenPermissions = {
  READ_CDN: ['GET /cdn/*', 'GET /api/stats/*'],
  UPLOAD_FILES: ['POST /upload/*'],
  MANAGE_CACHE: ['POST /api/preload', 'POST /api/pin/*'],
  VIEW_ANALYTICS: ['GET /api/metrics', 'GET /api/stats/*'],
  ADMIN: ['*'], // Full access
}
```

### 📊 Usage Tracking & Billing

#### Real-Time Usage Monitoring

```bash
# Get user dashboard with usage stats
curl -H "X-API-Key: your_session_token" \
  http://localhost:4500/users/dashboard

# Get detailed token usage
curl -H "X-API-Key: your_session_token" \
  http://localhost:4500/users/tokens/token_id/usage
```

#### Usage Metrics Tracked

- **Request Count**: Per minute, daily, monthly
- **Bandwidth Usage**: Upload and download tracking
- **Cache Performance**: Hit/miss ratios
- **Storage Usage**: File storage consumption
- **Geographic Distribution**: Request origins

#### Automatic Limit Enforcement

- **Rate Limiting**: Automatic throttling based on tier
- **Usage Quotas**: Blocking when limits exceeded
- **Overage Alerts**: Notifications for approaching limits
- **Graceful Degradation**: Soft limits with warnings

### 🏪 User Workflow

#### For New Users

1. **Register**: Create account with chosen subscription tier
2. **Verify**: Email verification (optional)
3. **Create Token**: Generate API token with needed permissions
4. **Start Using**: Begin making API calls with token
5. **Monitor**: Track usage via dashboard

#### For Existing Users

1. **Upgrade/Downgrade**: Change subscription tier anytime
2. **Manage Tokens**: Create, revoke, and monitor tokens
3. **Usage Analytics**: View detailed usage patterns
4. **Billing History**: Track subscription and usage costs

### 🔒 Security Features

#### Token Security

- **Secure Generation**: Cryptographically secure random tokens
- **Hash Storage**: Tokens stored as SHA-256 hashes
- **Expiration Support**: Optional token expiration dates
- **Immediate Revocation**: Instant token deactivation

#### Access Control

- **Permission Validation**: Every request checked against token permissions
- **Usage Limits**: Automatic enforcement of subscription limits
- **Audit Logging**: Complete access and usage logging
- **Anomaly Detection**: Unusual usage pattern alerts

## 📊 Monitoring & Analytics

### 🔍 Advanced Monitoring Features

#### System Metrics

- **CPU Usage**: Real-time CPU utilization tracking
- **Memory Pressure**: Heap and RSS memory monitoring
- **Event Loop Lag**: Node.js event loop performance
- **Connection Stats**: Active/queued connections by IP
- **Response Times**: P95, P99 latency distributions

#### Application Metrics

- **Cache Performance**: Hit rates, eviction patterns, memory usage
- **Endpoint Health**: Response times, availability scores
- **Security Events**: Blocked IPs, failed auth attempts
- **Circuit Breaker Status**: Service health and failure rates

#### Connection Management

- **Concurrent Connections**: Real-time connection tracking
- **Connection Queuing**: Queue depth and wait times
- **Per-IP Limits**: Connection usage by client IP
- **Pool Utilization**: Connection pool efficiency

### 📈 Metrics Endpoints

```bash
# Comprehensive metrics dashboard
curl http://localhost:4500/api/metrics

# System health and performance
curl http://localhost:4500/api/metrics/system

# Prometheus-compatible metrics
curl http://localhost:4500/api/metrics/prometheus

# Connection statistics
curl http://localhost:4500/api/connections/stats

# Security status
curl http://localhost:4500/api/security/stats

# Circuit breaker status
curl http://localhost:4500/api/circuit-breakers
```

## 🔧 Configuration Options

### 🌍 Environment-Based Configuration

The system supports multiple environments with optimized defaults:

#### Development Environment

```typescript
// Development optimized settings
{
  maxConcurrentConnections: 100,
  maxConnectionsPerIP: 10,
  connectionPoolSize: 50,
  security: {
    enableCsrf: false,
    enableRequestSigning: false,
    rateLimitMax: 1000
  }
}
```

#### Production Environment

```typescript
// Production optimized settings
{
  maxConcurrentConnections: 1000,
  maxConnectionsPerIP: 20,
  connectionPoolSize: 500,
  security: {
    enableCsrf: true,
    enableRequestSigning: true,
    rateLimitMax: 100
  }
}
```

### 🔐 Security Configuration

```typescript
// Security settings per environment
security: {
  helmet: {
    contentSecurityPolicy: true,     // Production only
    crossOriginEmbedderPolicy: true  // Production only
  },
  rateLimit: {
    max: 100,                        // Requests per minute
    timeWindow: '1 minute'
  },
  ddosProtection: {
    enabled: true,
    threshold: 50,                   // Requests per minute
    blockDuration: 300               // 5 minutes
  }
}
```

### 🚀 Performance Configuration

```typescript
// Connection and performance tuning
performance: {
  connectionPoolSize: 500,           // HTTP connection pool
  maxConcurrentConnections: 1000,    // Global concurrent limit
  maxConnectionsPerIP: 20,           // Per-IP concurrent limit
  keepAliveTimeout: 30000,           // 30 seconds
  maxConnectionDuration: 300000,     // 5 minutes
  slowRequestThreshold: 5000         // 5 seconds
}
```

### 📦 Cache Configuration

```typescript
// Advanced cache settings
cache: {
  ttl: 3600,                        // Default TTL
  maxSize: 10000,                   // Max cache items
  redisUrl: 'redis://localhost:6379',
  connectionPooling: {
    keepAlive: true,
    maxSockets: 10,
    timeout: 2000
  },
  warmingBatchSize: 10,             // Cache warming batch size
  evictionThreshold: 0.8            // Memory pressure threshold
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

### 🚀 Concurrent Connection Optimization

#### Connection Pool Management

- **Pool Size**: Configure based on expected concurrent load
- **Keep-Alive**: Enable persistent connections for better performance
- **Queue Management**: Handle connection overflow gracefully
- **Per-IP Limits**: Prevent single client from exhausting resources

#### Monitoring Connection Health

```bash
# Monitor active connections
curl http://localhost:4500/api/connections/stats

# Check connection pool utilization
curl http://localhost:4500/api/metrics/system
```

### 🔄 Cache Optimization

#### Intelligent Caching

- **Cache Warming**: Proactively load popular content
- **Memory Pressure**: Automatic eviction based on memory usage
- **Batch Processing**: Optimize cache operations with batching
- **Connection Pooling**: Redis connection optimization

#### Cache Performance Tuning

```typescript
// Optimal cache settings
cache: {
  ttl: 3600,                    // 1 hour default
  maxSize: 10000,               // Adjust based on memory
  warmingBatchSize: 10,         // Batch cache warming
  evictionThreshold: 0.8,       // Trigger cleanup at 80%
  connectionPoolSize: 10        // Redis connection pool
}
```

### 🛡️ Security & Performance Balance

#### Rate Limiting Strategy

- **Tiered Limits**: Different limits for authenticated vs anonymous users
- **Dynamic Scaling**: Adjust limits based on system load
- **IP-based Protection**: Prevent abuse from single sources

#### Circuit Breaker Configuration

```typescript
// Circuit breaker settings
circuitBreaker: {
  failureThreshold: 5,          // Failures before opening
  recoveryTimeout: 30000,       // 30 seconds recovery
  monitoringPeriod: 60000       // 1 minute monitoring
}
```

### 📊 Performance Monitoring

#### Key Metrics to Track

- **Connection Utilization**: Active vs max connections
- **Response Times**: P95, P99 latencies
- **Cache Hit Rates**: Target >80% for optimal performance
- **Error Rates**: Monitor failure patterns
- **Memory Usage**: Prevent memory pressure

#### Performance Alerts

```bash
# Set up monitoring alerts for:
# - Connection pool exhaustion
# - High response times (>5s)
# - Low cache hit rates (<70%)
# - High error rates (>5%)
# - Memory pressure (>80%)
```

## 🚀 Production Deployment

### 📋 Pre-Deployment Checklist

- [ ] Configure environment variables for production
- [ ] Set up Redis cluster for high availability
- [ ] Configure load balancer for multiple instances
- [ ] Set up monitoring and alerting
- [ ] Test concurrent connection limits
- [ ] Verify security configurations
- [ ] Set up log aggregation

### 🔄 Scaling Guidelines

#### Horizontal Scaling

- **Load Balancer**: Distribute traffic across multiple instances
- **Session Affinity**: Use Redis for shared session storage
- **Health Checks**: Configure proper health check endpoints

#### Vertical Scaling

- **Memory**: Increase for larger cache sizes
- **CPU**: Scale based on connection processing needs
- **Connection Limits**: Adjust based on server capacity

### 📊 Performance Benchmarks

#### Expected Performance (Production Hardware)

- **Concurrent Connections**: 1000+ concurrent connections
- **Response Time**: <100ms for cached content
- **Throughput**: 10,000+ requests per second
- **Cache Hit Rate**: >90% for popular content

## 🤝 Contributing

### Development Guidelines

1. **Code Style**: Follow existing TypeScript patterns with strict typing
2. **Testing**: Add comprehensive tests for new features
3. **Documentation**: Update README and inline docs
4. **Error Handling**: Use structured error types with correlation IDs
5. **Security**: Follow security best practices for all endpoints
6. **Performance**: Consider impact on concurrent connections

### Architecture Principles

- **Dependency Injection**: Use service container for all dependencies
- **Circuit Breakers**: Implement for all external service calls
- **Monitoring**: Add metrics for all new features
- **Configuration**: Use environment-based config management

## 📄 License

This project is part of the WCDN system. See main project LICENSE for details.

## 🆘 Support

- **Issues**: Create GitHub issue with logs and reproduction steps
- **Performance**: Include connection stats and system metrics
- **Security**: Report security issues privately
- **Documentation**: Check main project README.md for additional context
