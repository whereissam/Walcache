#!/bin/bash

echo "🚀 Walcache SDK Frontend Demo Setup"
echo "===================================="

# Check if backend is running
echo "🔍 Checking if backend is running on port 4500..."
if curl -s http://localhost:4500/health > /dev/null 2>&1; then
    echo "✅ Backend is running on port 4500"
    BACKEND_PORT=4500
elif curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend is running on port 3000"
    BACKEND_PORT=3000
else
    echo "⚠️  Backend not detected. Starting mock backend..."
    # You can start your actual backend here
    echo "💡 To start the real backend, run:"
    echo "   cd ../../cdn-server && bun dev"
    echo "   OR"
    echo "   cd ../examples && bun production-backend.js"
fi

echo ""
echo "🌐 Starting frontend demo server..."
echo "📱 Open http://localhost:3001 in your browser"
echo "🔄 API calls will proxy to backend on port ${BACKEND_PORT:-4500}"
echo ""
echo "💡 Available demos in the frontend:"
echo "  📤 Upload Asset - Test multi-chain uploads"
echo "  🔍 Asset Information - Get asset details"
echo "  🌐 Multi-Chain CDN URLs - Generate optimized URLs"
echo "  🔐 Asset Verification - Test ownership verification"
echo "  📊 Service Metrics - View performance metrics"
echo ""
echo "⭐ Features to test:"
echo "  - Upload files to different chains (Sui, Ethereum, Solana)"
echo "  - Create NFTs with metadata"
echo "  - Test cross-chain asset verification"
echo "  - Generate optimized CDN URLs"
echo "  - View real-time metrics"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Start the frontend server
cd frontend-demo && bun server.js