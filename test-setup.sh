#!/bin/bash

echo "🧪 Testing WCDN Setup..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install from https://bun.sh"
    exit 1
fi

echo "✅ Bun is installed"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "⚠️  Installing frontend dependencies..."
    bun install
fi

if [ ! -d "cdn-server/node_modules" ]; then
    echo "⚠️  Installing server dependencies..."
    cd cdn-server && bun install && cd ..
fi

echo "✅ Dependencies installed"

# Test environment file
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file..."
    cp .env.example .env
fi

echo "✅ Environment configured"

# Test if ports are available
if lsof -Pi :4500 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 4500 is in use. You may need to stop other services."
else
    echo "✅ Port 4500 is available"
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 5173 is in use. You may need to stop other services."
else
    echo "✅ Port 5173 is available"
fi

echo ""
echo "🚀 Ready to start WCDN!"
echo ""
echo "To start development:"
echo "  bun run dev:all        (starts both server and frontend)"
echo ""
echo "Or start separately:"
echo "  bun run dev:server     (CDN server on port 4500)"
echo "  bun run dev:frontend   (Dashboard on port 5173)"
echo ""
echo "URLs:"
echo "  Dashboard: http://localhost:5173"
echo "  CDN API:   http://localhost:4500/cdn/:cid"
echo "  Health:    http://localhost:4500/health"