#!/bin/bash

echo "🚀 Walcache SDK React Demo Setup"
echo "================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the react-demo directory."
    echo "   cd packages/sdk/examples/react-demo"
    exit 1
fi

# Check if backend is running
echo "🔍 Checking if backend is running..."
if curl -s http://localhost:4500/health > /dev/null 2>&1; then
    echo "✅ Backend detected on port 4500"
    BACKEND_PORT=4500
elif curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend detected on port 3000"
    BACKEND_PORT=3000
else
    echo "⚠️  Backend not detected. Starting mock backend info..."
    echo ""
    echo "💡 To start your backend, run one of these commands:"
    echo "   Option 1 (CDN Server): cd ../../cdn-server && bun dev"
    echo "   Option 2 (Production): cd ../examples && bun production-backend.js"
    echo ""
    echo "🔄 The React demo will proxy API calls to http://localhost:3000"
    echo "   Make sure your backend is running on port 3000 or update vite.config.ts"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    if command -v bun &> /dev/null; then
        bun install
    elif command -v yarn &> /dev/null; then
        yarn install
    else
        npm install
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🌐 Starting React development server..."
echo "📱 Open http://localhost:3001 in your browser"
echo "🔄 API calls will proxy to backend on port ${BACKEND_PORT:-3000}"
echo ""
echo "💡 React Demo Features:"
echo "  📤 Upload Assets - Interactive file upload with chain selection"
echo "  🔍 Asset Information - Real-time asset lookup and status"
echo "  🌐 Multi-Chain URLs - Generate optimized CDN URLs"
echo "  🔐 Asset Verification - Test ownership verification"
echo "  📊 Service Metrics - Live performance dashboard"
echo "  🎯 Use Case Examples - See real-world implementations"
echo "  💻 Integration Guide - Complete developer documentation"
echo ""
echo "⭐ Features to test:"
echo "  - Upload files to different blockchains (Sui, Ethereum, Solana)"
echo "  - Create NFTs with metadata"
echo "  - Test cross-chain asset verification"
echo "  - Generate optimized CDN URLs with image processing"
echo "  - View real-time performance metrics"
echo "  - Explore all 6 production use cases"
echo ""
echo "🛑 Press Ctrl+C to stop the development server"
echo ""

# Start the development server
if command -v bun &> /dev/null; then
    bun dev
elif command -v yarn &> /dev/null; then
    yarn dev
else
    npm run dev
fi