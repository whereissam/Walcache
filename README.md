<div align="center">
  <img src="https://github.com/whereissam/Walcache/blob/main/src/assets/walcache-logo.jpeg?raw=true" alt="Walcache Logo" width="120" height="120" />
  
  # Walcache
  
  **High-performance CDN for Walrus decentralized storage**
  
  *Supporting multi-chain blob status, fast access, and file upload via Tusky.io*
  
  [![GitHub](https://img.shields.io/badge/GitHub-Walcache-blue?style=flat-square&logo=github)](https://github.com/whereissam/Walcache)
  [![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://reactjs.org/)
  
</div>

![](https://i.imgur.com/Tg9D5UZ.jpeg)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Multi-Chain Support](#multi-chain-support)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Development](#development)
- [Contributing](#contributing)

---

## 🚀 Overview

Walcache bridges Walrus decentralized storage and web apps, featuring:

- **CDN Layer**: Intelligent caching of Walrus blobs (Redis/memory fallback)
- **Multi-Chain Sync**: Query and display blob status across Sui, Ethereum, Solana (mocked for hackathon)
- **One-Line SDK**: Instantly get CDN URL for any blob on any supported chain
- **File Upload**: Upload files to Walrus via Tusky.io
- **Vault Management**: Organize files in encrypted/public vaults
- **Analytics Dashboard**: Monitor cache and usage stats
- **Multi-tier Fallback**: Reliable delivery with multiple Walrus aggregators
- **Security & Auth**: API key protection for sensitive ops
- **Cache Invalidation**: Auto/manual cache management
- **Endpoint Health Monitoring**: Automatic failover for Walrus endpoints

## ⛓️ Multi-Chain Support

### SDK Usage

Developers can get CDN links for different chains with just one line of code:

```javascript
import { getWalrusCDNUrl } from 'wcdn-sdk'

// Sui
const suiUrl = getWalrusCDNUrl(blobId, { chain: 'sui' })

// Ethereum
const ethUrl = getWalrusCDNUrl(blobId, { chain: 'ethereum' })

// Solana
const solUrl = getWalrusCDNUrl(blobId, { chain: 'solana' })
```

Default support for Sui, Ethereum, Solana (extensible, hackathon uses mocked status queries)

### UI Features

- Frontend Dashboard provides chain selector (Sui/Ethereum/Solana)
- Display blob status for selected chain (e.g., on-chain, accessible, cache status, etc., mocked data)
- Support multi-chain blob status synchronization queries for convenient one-stop management

## 🏗️ Architecture

```
User Upload → Tusky.io → Walrus Network → Walcache Cache → Fast Access
     ↓              ↓            ↓             ↓            ↓
   React UI    Tusky API    Blob Storage   CDN Server   End Users
```

📊 **[View Detailed Architecture Chart](./ARCHITECTURE.md)** - Complete system diagrams, data flows, and security layers

## System Workflow

### File Upload

1. User selects chain (Sui/Ethereum/Solana) and vault in UI, drags and drops files to upload
2. Frontend sends file and chain information to backend
3. Backend uploads to Walrus via Tusky.io API, returns blobId
4. Backend automatically caches the blob and marks chain type
5. Frontend displays CDN URL and multi-chain status

### CDN Access

1. User/application requests `/cdn/{blobId}?chain=sui`
2. Server queries cache by chain type, falls back to corresponding chain's Walrus aggregator if not found
3. Returns content and records chain type, cache status

---

## Quick Start

### Prerequisites

- Node.js 18+
- Redis server (optional)
- Tusky.io API key

### Installation

```bash
git clone <repository>
cd Walcache
bun install
```

### Environment

```bash
# Multi-chain configuration support
WALRUS_ENDPOINT_SUI=https://publisher.walrus-testnet.walrus.space
WALRUS_ENDPOINT_ETH=https://eth-aggregator.walrus.space
WALRUS_ENDPOINT_SOL=https://sol-aggregator.walrus.space

# Cache Configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
MAX_CACHE_SIZE=1000

# Security & Authentication
API_KEY_SECRET=your-secure-api-key-here-change-this-in-production
ALLOWED_ORIGINS=http://localhost:4500,http://localhost:5173,https://yourdomain.com

# Tusky.io Integration
TUSKY_API_KEY=your_tusky_api_key
TUSKY_API_URL=https://api.tusky.io
TUSKY_DEFAULT_VAULT_ID=your-default-vault-id
```

### Start Development

```bash
# Terminal 1: Start backend CDN server (port 4500)
cd cdn-server
bun install
bun dev

# Terminal 2: Start frontend (port 5173)
bun dev
```

### Access

- Frontend Dashboard: http://localhost:5173
- CDN Endpoint: http://localhost:4500/cdn/:cid
- API Documentation: http://localhost:4500/api/health

📝 **[Local Walrus Setup Guide](./LOCAL_WALRUS_SETUP.md)** - Complete guide for setting up local Walrus publisher for development

## API Reference

### CDN Endpoints

```http
GET /cdn/:cid?chain=sui|ethereum|solana
# Return cached content by chain type

GET /api/stats/:cid
# Get analytics for specific blob ID
# Response: { stats, cached, pinned, cacheDate, ttl }

GET /api/metrics
# Global CDN performance metrics
# Response: { global, cache, topCIDs }
```

### Multi-Chain Blob Status

```http
GET /api/blob-status/:cid
# Return blob status for each chain (mocked)
# Response: { sui: {...}, ethereum: {...}, solana: {...} }
```

### Upload Endpoints

```http
POST /upload/file?vaultId=:id
# Upload file to Walrus via Tusky (requires API key)
# Header: X-API-Key: your-api-key
# Body: multipart/form-data with file
# Response: { success, file, cdnUrl, cached }

POST /upload/walrus
# Direct upload to Walrus network (bypasses vaults)
# Body: multipart/form-data with file
# Response: { success, blobId, cdnUrl, directUrl, cached }

GET /upload/vaults
# List user's vaults with file counts
# Response: { vaults }

POST /upload/vaults
# Create new vault (requires API key)
# Header: X-API-Key: your-api-key
# Body: { name, description }
# Response: { vault }

GET /upload/files?vaultId=:id
# List files in vault
# Response: { files }

DELETE /upload/files/:fileId
# Delete file from vault and cache (requires API key)
# Header: X-API-Key: your-api-key
# Response: { success, message }
```

### Cache Management

```http
POST /api/preload
# Preload multiple CIDs into cache (requires API key)
# Header: X-API-Key: your-api-key
# Body: { cids: string[] }
# Response: { cached, errors, total }

POST /api/pin/:cid
# Pin CID to prevent cache eviction (requires API key)
# Header: X-API-Key: your-api-key
# Response: { success }

DELETE /api/pin/:cid
# Unpin CID from cache (requires API key)
# Header: X-API-Key: your-api-key
# Response: { success }

POST /api/cache/clear
# Clear entire cache (requires API key)
# Header: X-API-Key: your-api-key
# Response: { success }
```

## Features

### One Line Code for Multi-Chain CDN Links

```javascript
getWalrusCDNUrl(blobId, { chain })
```

### UI Multi-Chain Switching

- Dashboard can switch between Sui/Ethereum/Solana to display blob status
- Cache/Upload/Management/Analytics: same as original features
- Multi-chain aggregator fallback: automatically select available nodes

### Upload Management

- **Drag & Drop**: Intuitive file upload interface
- **Vault Organization**: Create and manage file collections
- **Direct Walrus Upload**: Bypass vaults for pure decentralized storage
- **Progress Tracking**: Real-time upload progress indicators
- **File Metadata**: Size, type, creation date, and Walrus blob ID

### CDN Performance

- **Intelligent Caching**: Automatic cache population on upload
- **Multi-tier Storage**: Redis primary, memory fallback
- **Cache Analytics**: Hit rates, latency metrics, popular content
- **Content Pinning**: Prevent important files from cache eviction
- **Preload API**: Warm cache with anticipated content

### Analytics Dashboard

- **Global Metrics**: Total requests, hit rates, average latency
- **Per-CID Stats**: Individual blob performance tracking
- **Cache Health**: Memory usage, key counts, storage efficiency
- **Top Content**: Most requested blobs and performance leaders

## Development

### Tech Stack

- **Frontend**: React + TypeScript + Zustand
- **Backend**: Fastify + TypeScript + Redis
- **Cache**: Multi-chain cache partitioning support
- **UI**: Shadcn/ui, chain selector, blob status panel

### Project Structure

```
Walcache/
├── src/                    # Frontend React application
│   ├── components/         # UI components
│   ├── store/             # Zustand state management
│   ├── lib/               # Utilities and helpers
│   └── routes/            # TanStack Router pages
├── cdn-server/            # Backend Fastify server
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── config/        # Configuration
│   │   └── types/         # TypeScript definitions
│   └── package.json
├── packages/sdk/          # Multi-chain SDK
│   ├── src/
│   │   ├── index.ts       # Main SDK exports
│   │   ├── client.ts      # Walcache client
│   │   └── types.ts       # Type definitions
│   └── package.json
├── public/                # Static assets
└── package.json           # Frontend dependencies
```

## Hackathon Tips

### Multi-Chain Status Can Be Mocked First, Create UI/SDK Interface First

- Real on-chain synchronization can be extended later
- Emphasize "one line code multi-chain CDN" and "UI one-click switch multi-chain blob status" highlights

### Security Features

- **API Key Authentication**: Protect sensitive operations
- **Rate Limiting**: Prevent abuse with differentiated limits
- **CORS Protection**: Configurable allowed origins
- **Input Validation**: Comprehensive request validation with Zod
- **Cache Isolation**: Secure cache invalidation and access control

## Troubleshooting

### Common Issues

**Upload Failures**

- Verify TUSKY_API_KEY is valid
- Check file size limits (100MB vault, 10MB direct)
- Ensure vault exists and is accessible

**Cache Issues**

- Verify Redis connection if using Redis cache
- Check available memory for in-memory cache
- Monitor cache hit rates in analytics

**CDN Performance**

- Multiple Walrus aggregators provide redundancy
- Cache warming improves first-access latency
- Pin frequently accessed content

### Health Checks

```bash
# Check backend health
curl http://localhost:4500/upload/health

# Verify cache statistics
curl http://localhost:4500/api/cache/stats

# Test CDN functionality
curl http://localhost:4500/cdn/your_blob_id
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Walrus Network](https://walrus.site/) - Decentralized storage infrastructure
- [Tusky.io](https://tusky.io/) - Walrus integration platform
- [Fastify](https://fastify.io/) - High-performance web framework
- [React](https://react.dev/) - Frontend framework
