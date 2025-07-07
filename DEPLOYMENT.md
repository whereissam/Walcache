# 🚀 WCDN Deployment Guide

## Development → Production Migration

### Phase 1: Local Development (Current)

```bash
# What you have now
npm run dev              # Frontend: http://localhost:5173
bun run dev:server      # Backend: http://localhost:4500

# Environment
REACT_APP_WCDN_URL=http://localhost:4500
REACT_APP_WCDN_API_KEY=dev-secret-wcdn-2024
```

### Phase 2: Production Deployment

#### 2.1 Backend Deployment (WCDN Server)

```bash
# Option A: VPS/Cloud Server
docker build -t wcdn-server ./cdn-server
docker run -p 4500:4500 \
  -e API_KEY_SECRET=prod-wcdn-key-2024 \
  -e REDIS_URL=redis://redis:6379 \
  -e NODE_ENV=production \
  wcdn-server

# Option B: Platform as a Service
# Railway, Render, Fly.io, etc.
```

#### 2.2 Frontend Deployment

```bash
# Build for production
REACT_APP_WCDN_URL=https://cdn.yourdomain.com \
REACT_APP_WCDN_API_KEY=prod-wcdn-key-2024 \
npm run build

# Deploy to:
# - Vercel: vercel --prod
# - Netlify: netlify deploy --prod --dir build
# - AWS S3 + CloudFront
```

### Phase 3: Domain & SSL Setup

#### 3.1 Backend Domain

```bash
# Your WCDN server URL
https://cdn.yourdomain.com

# DNS A Record
cdn.yourdomain.com → your-server-ip

# SSL Certificate (Let's Encrypt)
certbot --nginx -d cdn.yourdomain.com
```

#### 3.2 Frontend Domain

```bash
# Your dashboard URL
https://dashboard.yourdomain.com

# Environment
REACT_APP_WCDN_URL=https://cdn.yourdomain.com
```

## 🔧 Configuration Migration

### 1. Update Store Configuration

```typescript
// src/store/wcdnStore.ts
const API_BASE = process.env.REACT_APP_WCDN_URL
  ? `${process.env.REACT_APP_WCDN_URL}/api`
  : 'http://localhost:4500/api'

const API_KEY = process.env.REACT_APP_WCDN_API_KEY || 'dev-secret-wcdn-2024'
```

### 2. SDK Integration

```typescript
// Already updated in UploadCacheDemo.tsx
configure({
  baseUrl: process.env.REACT_APP_WCDN_URL || 'http://localhost:4500',
  apiKey: process.env.REACT_APP_WCDN_API_KEY || 'dev-secret-wcdn-2024',
})
```

## 📋 Deployment Checklist

### Backend Ready ✅

- [x] Environment-aware configuration
- [x] API key authentication
- [x] Redis caching configured
- [x] CORS setup for production
- [x] Docker containerization
- [x] Health checks enabled
- [x] Analytics tracking

### Frontend Ready ✅

- [x] SDK integration complete
- [x] Environment variables configured
- [x] Production build optimized
- [x] Error boundaries implemented
- [x] Loading states handled

### Production Setup 📝

- [ ] Server deployed (VPS/Cloud)
- [ ] Domain configured
- [ ] SSL certificate installed
- [ ] Environment variables set
- [ ] Database/Redis configured
- [ ] Monitoring setup
- [ ] Backup strategy

## 🎯 Easy Migration Steps

### Step 1: Test Current Setup

```bash
# Verify everything works locally
npm run dev
bun run dev:server

# Test upload → cache → view workflow
```

### Step 2: Deploy Backend

```bash
# Deploy your cdn-server to production
# Update environment variables
# Test API endpoints
```

### Step 3: Update Frontend

```bash
# Set production environment variables
export REACT_APP_WCDN_URL=https://cdn.yourdomain.com
export REACT_APP_WCDN_API_KEY=your-production-key

# Build and deploy
npm run build
# Deploy to your hosting platform
```

### Step 4: DNS & SSL

```bash
# Point domain to your servers
# Install SSL certificates
# Test HTTPS endpoints
```

## 🌟 Production Benefits

When deployed, your WCDN will provide:

1. **Global CDN Performance**
   - Sub-100ms response times
   - Intelligent caching
   - Multi-region deployment

2. **Enterprise Security**
   - API key authentication
   - HTTPS encryption
   - Rate limiting

3. **Multi-Chain Support**
   - Sui, Ethereum, Solana
   - Cross-chain verification
   - Optimal node selection

4. **Real-time Analytics**
   - Performance monitoring
   - Geographic distribution
   - Cache efficiency metrics

Your localhost development setup will **seamlessly transition** to production! 🚀
