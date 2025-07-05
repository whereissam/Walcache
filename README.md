# WCDN (Walrus Content Delivery Network)

A high-performance CDN system for Walrus decentralized storage, supporting multi-chain blob status, fast access, and file upload via Tusky.io.

## Overview

WCDN bridges Walrus decentralized storage and web apps, featuring:

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

## Multi-Chain Support

### SDK Usage
開發者只需一行 code，即可獲取不同鏈的 CDN 連結：

```javascript
import { getWalrusCDNUrl } from 'wcdn-sdk';

// Sui
const suiUrl = getWalrusCDNUrl(blobId, { chain: 'sui' });

// Ethereum
const ethUrl = getWalrusCDNUrl(blobId, { chain: 'ethereum' });

// Solana
const solUrl = getWalrusCDNUrl(blobId, { chain: 'solana' });
```

預設支援 Sui，Ethereum，Solana（可擴展，hackathon 先 mock 狀態查詢）

### UI 功能
- 前端 Dashboard 提供鏈選擇器（Sui/Ethereum/Solana）
- 顯示所選鏈下 blob 的狀態（如：已上鏈、可存取、快取狀態等，mock 資料）
- 支援多鏈 blob 狀態同步查詢，方便用戶一站式管理

## Architecture

```
User Upload → Tusky.io → Walrus Network → WCDN Cache → Fast Access
     ↓              ↓            ↓             ↓            ↓
   React UI    Tusky API    Blob Storage   CDN Server   End Users
```

📊 **[View Detailed Architecture Chart](./ARCHITECTURE.md)** - Complete system diagrams, data flows, and security layers

## System Workflow

### File Upload
1. 用戶在 UI 選擇鏈（Sui/Ethereum/Solana）與 vault，拖曳上傳檔案
2. 前端將檔案與鏈資訊傳給後端
3. 後端透過 Tusky.io API 上傳到 Walrus，回傳 blobId
4. 後端自動快取該 blob，並標記鏈別
5. 前端顯示 CDN URL 與多鏈狀態

### CDN Access
1. 用戶/應用請求 `/cdn/{blobId}?chain=sui`
2. 伺服器根據鏈別查快取，無則 fallback 至對應鏈的 Walrus aggregator
3. 回傳內容並記錄鏈別、快取狀態

---

## Quick Start

### Prerequisites
- Node.js 18+
- Redis server (optional)
- Tusky.io API key

### Installation

```bash
git clone <repository>
cd WCDN
bun install
```

### Environment

```bash
# 支援多鏈配置
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
# 依鏈別回傳快取內容

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
# 回傳各鏈 blob 狀態（mock）
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

### 一行 code 多鏈 CDN 連結
```javascript
getWalrusCDNUrl(blobId, { chain })
```

### UI 多鏈切換
- Dashboard 可切換 Sui/Ethereum/Solana，顯示 blob 狀態
- 快取/上傳/管理/分析：同原有功能
- 多鏈 aggregator fallback：自動選擇可用節點

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
- **前端**: React + TypeScript + Zustand
- **後端**: Fastify + TypeScript + Redis
- **快取**: 支援多鏈快取分區
- **UI**: Shadcn/ui，鏈選擇器、blob 狀態面板

### Project Structure

```
WCDN/
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
│   │   ├── client.ts      # WCDN client
│   │   └── types.ts       # Type definitions
│   └── package.json
├── public/                # Static assets
└── package.json           # Frontend dependencies
```

## Hackathon Tips

### 多鏈狀態可先 mock，UI/SDK 介面先做出來
- 真正鏈上同步可後續擴展
- 強調「一行 code 多鏈 CDN」、「UI 一鍵切換多鏈 blob 狀態」亮點

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