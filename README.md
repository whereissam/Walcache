# WCDN (Walrus Content Delivery Network)

A high-performance CDN system that caches Walrus decentralized storage content for faster access, with integrated file upload capabilities via Tusky.io.

## Overview

WCDN provides a seamless bridge between the Walrus decentralized storage network and traditional web applications by offering:

- **CDN Layer**: Intelligent caching of Walrus blobs with Redis/memory fallback
- **File Upload System**: Upload files to Walrus via Tusky.io integration
- **Vault Management**: Organize files in encrypted or public vaults
- **Analytics Dashboard**: Monitor cache performance and usage statistics
- **Multi-tier Fallback**: Reliable content delivery with multiple Walrus aggregators

## Architecture

```
User Upload → Tusky.io → Walrus Network → WCDN Cache → Fast Access
     ↓              ↓            ↓             ↓            ↓
   React UI    Tusky API    Blob Storage   CDN Server   End Users
```

### Core Components

- **Frontend**: React + TypeScript dashboard with TanStack Router
- **Backend**: Fastify server with Redis caching and analytics
- **Storage**: Walrus decentralized network via Tusky.io
- **State Management**: Zustand with DevTools integration
- **UI Components**: Shadcn/ui with responsive design

## System Workflow

### File Upload Process

1. **User Interface**: Select vault and drag/drop files in React dashboard
2. **File Processing**: Frontend uploads to backend with multipart form data
3. **Tusky Integration**: Backend forwards to Tusky.io API for Walrus storage
4. **Blob Storage**: Tusky stores file on Walrus network, returns blob ID (CID)
5. **Auto-caching**: Backend immediately caches the uploaded file for fast access
6. **UI Update**: Frontend displays file with CDN URL and management options

### CDN Access Flow

1. **Request**: User/app requests `/cdn/{blobId}`
2. **Cache Check**: Server checks Redis cache first, then memory cache
3. **Cache Hit**: Returns cached content immediately with appropriate headers
4. **Cache Miss**: Fetches from Walrus aggregator, caches result, returns content
5. **Fallback**: Multiple Walrus aggregators ensure availability
6. **Analytics**: Records hit/miss statistics and latency metrics

---

## Quick Start

### Prerequisites

- Node.js 18+
- Redis server (optional, memory fallback available)
- Tusky.io API key

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd WCDN
npm install
```

2. **Configure environment:**
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
TUSKY_API_KEY=your_tusky_api_key
TUSKY_API_URL=https://api.tusky.io/v1
REDIS_URL=redis://localhost:6379
```

3. **Start development servers:**
```bash
# Terminal 1: Start backend CDN server (port 4500)
cd cdn-server
npm install
npm run dev

# Terminal 2: Start frontend (port 5173)
npm run dev
```

4. **Access the application:**
- Frontend Dashboard: http://localhost:5173
- CDN Endpoint: http://localhost:4500/cdn/:cid
- API Documentation: http://localhost:4500/api/health

## API Reference

### CDN Endpoints

```http
GET /cdn/:cid
# Serve cached Walrus content by blob ID
# Response: File content with appropriate MIME type

GET /api/stats/:cid
# Get analytics for specific blob ID
# Response: { stats, cached, pinned, cacheDate, ttl }

GET /api/metrics
# Global CDN performance metrics
# Response: { global, cache, topCIDs }
```

### Upload Endpoints

```http
POST /upload/file?vaultId=:id
# Upload file to Walrus via Tusky
# Body: multipart/form-data with file
# Response: { success, file, cdnUrl, cached }

GET /upload/vaults
# List user's vaults with file counts
# Response: { vaults }

POST /upload/vaults
# Create new vault
# Body: { name, description }
# Response: { vault }

GET /upload/files?vaultId=:id
# List files in vault
# Response: { files }

DELETE /upload/files/:fileId
# Delete file from vault and cache
# Response: { success, message }
```

### Cache Management

```http
POST /api/preload
# Preload multiple CIDs into cache
# Body: { cids: string[] }
# Response: { cached, errors, total }

POST /api/pin/:cid
# Pin CID to prevent cache eviction
# Response: { success }

DELETE /api/pin/:cid
# Unpin CID from cache
# Response: { success }

POST /api/cache/clear
# Clear entire cache
# Response: { success }
```

## Configuration

### Environment Variables

```bash
# Tusky.io Configuration
TUSKY_API_KEY=your_api_key_here
TUSKY_API_URL=https://api.tusky.io/v1
TUSKY_DEFAULT_VAULT_ID=optional_default_vault

# Cache Configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
MAX_CACHE_SIZE=1000

# Server Configuration
PORT=4500
HOST=0.0.0.0
NODE_ENV=development
```

## Features

### Upload Management
- **Drag & Drop**: Intuitive file upload interface
- **Vault Organization**: Create and manage file collections
- **Progress Tracking**: Real-time upload progress indicators
- **File Metadata**: Size, type, creation date, and Walrus blob ID
- **Bulk Operations**: Multiple file selection and management

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

### Reliability Features
- **Multi-aggregator Fallback**: Multiple Walrus endpoints
- **Error Handling**: Graceful degradation and user feedback
- **Retry Logic**: Automatic retry for transient failures
- **Health Monitoring**: Service status and configuration validation

## Development

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
├── public/                # Static assets
└── package.json           # Frontend dependencies
```

### Key Technologies

- **Frontend**: React 18, TypeScript, TanStack Router, Zustand
- **Backend**: Fastify, TypeScript, Redis, Node.js
- **Storage**: Walrus network, Tusky.io API
- **UI**: Shadcn/ui, Tailwind CSS, Lucide icons
- **Build**: Vite, ESLint, Prettier

## Troubleshooting

### Common Issues

**Upload Failures**
- Verify TUSKY_API_KEY is valid
- Check file size limits (100MB default)
- Ensure vault exists and is accessible

**Cache Issues**
- Verify Redis connection if using Redis cache
- Check available memory for in-memory cache
- Monitor cache hit rates in analytics

**CDN Performance**
- Multiple Walrus aggregators provide redundancy
- Cache warming improves first-access latency
- Pin frequently accessed content

**Network Connectivity**
- Walrus network availability can vary
- Fallback mechanisms provide resilience
- Check aggregator status if issues persist

### Health Checks

```bash
# Check backend health
curl http://localhost:4500/upload/health

# Verify cache statistics
curl http://localhost:4500/api/cache/stats

# Test CDN functionality
curl http://localhost:4500/cdn/your_blob_id
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use ESLint and Prettier for code formatting
- Write tests for new features
- Update documentation for API changes
- Follow semantic versioning

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Walrus Network](https://walrus.site/) - Decentralized storage infrastructure
- [Tusky.io](https://tusky.io/) - Walrus integration platform
- [Fastify](https://fastify.io/) - High-performance web framework
- [React](https://react.dev/) - Frontend framework

