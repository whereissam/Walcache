# 🚀 Walcache SDK React Demo

A comprehensive React demo showcasing the Walcache SDK's multi-chain storage capabilities. This demo illustrates how developers can integrate the SDK into their backend services and connect React frontends to those backends.

## ✨ Features

### 📤 **Upload Assets**
- Interactive file upload with drag & drop
- Chain selection (Ethereum, Sui, Solana)
- NFT creation with metadata
- Batch file processing
- Real-time upload progress

### 🔍 **Asset Information**
- Real-time asset lookup and status
- Performance metrics and analytics
- Multi-chain availability checking
- Cache and pin status monitoring

### 🌐 **Multi-Chain URLs**
- Generate optimized CDN URLs
- Image processing (resize, quality, format conversion)
- Performance optimization settings
- Global CDN distribution

### 🔐 **Asset Verification**
- Cross-chain ownership verification
- NFT/token gating functionality
- Real-time verification results
- Metadata enrichment

### 📊 **Service Metrics**
- Live performance dashboard
- Multi-chain statistics
- Cache hit rates and latency
- System health monitoring
- Auto-refresh capabilities

### 🎯 **Use Case Examples**
- dApp Frontend Hosting
- Data Marketplaces
- Gaming Assets
- Decentralized Identity
- Cross-Chain Logs
- Media Streaming

### 💻 **Integration Guide**
- Complete developer documentation
- Code examples for multiple frameworks
- Environment configuration
- API reference

## 🏗️ Architecture

```
React Frontend → Your Backend API → Walcache SDK → Blockchain
```

- **React App**: Makes API calls to your backend
- **Your Backend**: Integrates Walcache SDK for blockchain operations
- **Walcache SDK**: Handles all multi-chain complexity automatically

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (or Bun/Yarn)
- A running backend server with Walcache SDK integration

### Option 1: Using the Run Script (Recommended)

```bash
# Navigate to the react-demo directory
cd packages/sdk/examples/react-demo

# Run the demo (handles everything automatically)
./run-react-demo.sh
```

### Option 2: Manual Setup

```bash
# Install dependencies
npm install  # or yarn install / bun install

# Start development server
npm run dev  # or yarn dev / bun dev
```

The demo will be available at: **http://localhost:3001**

## 🔧 Configuration

### Backend Proxy

The React app proxies API calls to your backend. Update `vite.config.ts` if your backend runs on a different port:

```typescript
server: {
  port: 3001,
  proxy: {
    '/api': {
      target: 'http://localhost:3000', // Change this to your backend URL
      changeOrigin: true,
    },
  },
}
```

### Environment Variables

Your backend should have these environment variables configured:

```bash
WALCACHE_BASE_URL=https://your-cdn-domain.com
WALCACHE_API_KEY=your-api-key-here
WALCACHE_DEFAULT_CHAIN=sui
```

## 🎯 Demo Scenarios

### 1. **File Upload Flow**
1. Select a blockchain (Sui, Ethereum, Solana)
2. Drag & drop files or click to browse
3. Configure metadata and NFT options
4. Upload and receive CDN URLs + transaction details

### 2. **Asset Verification Flow**
1. Enter a wallet address and asset ID
2. Select the blockchain network
3. Verify ownership and view results
4. See metadata and access permissions

### 3. **URL Generation Flow**
1. Enter a blob ID
2. Configure image optimization settings
3. Generate optimized CDN URLs
4. Preview results and copy URLs

### 4. **Metrics Monitoring**
1. View real-time performance metrics
2. Monitor cache hit rates and latency
3. Check multi-chain availability
4. Enable auto-refresh for live updates

## 🛠️ Integration Examples

### Backend API Endpoints

Your backend should implement these endpoints that the React demo calls:

```typescript
POST /api/upload          // Upload files
GET  /api/asset/:id       // Get asset information
GET  /api/cdn/:id         // Generate CDN URLs
POST /api/verify          // Verify ownership
GET  /api/metrics         // Get performance metrics
```

### Example Backend Implementation

```typescript
import { WalcacheUseCases } from '@walcache/sdk'

const walcache = new WalcacheUseCases({
  baseUrl: process.env.WALCACHE_BASE_URL,
  apiKey: process.env.WALCACHE_API_KEY
})

// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  const result = await walcache.uploadAsset(req.file, {
    chain: req.body.chain,
    createNFT: req.body.createNFT === 'true'
  })
  res.json({ success: true, data: result })
})
```

## 🔗 Related

- [Main SDK Documentation](../../README.md)
- [Use Cases Demo](../use-cases-demo.js)
- [Production Backend Example](../production-backend.js)
- [Frontend Demo (Vanilla JS)](../frontend-demo/)

## 🤝 Contributing

This demo showcases production-ready patterns for integrating Walcache SDK. Feel free to:

- Add new demo scenarios
- Improve the UI/UX
- Add more framework examples
- Enhance error handling

## 📄 License

MIT License - see [LICENSE](../../../../LICENSE) file for details.

---

**Ready to build the future of multi-chain applications?** 🚀

This React demo shows you exactly how to integrate Walcache SDK into your production applications with zero blockchain complexity.