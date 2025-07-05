# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WCDN (Walrus Content Delivery Network) is a high-performance CDN system that bridges Walrus decentralized storage with traditional web applications. It provides intelligent caching, file upload via Tusky.io, and analytics tracking.

## Architecture

- **Frontend**: React 19 + TypeScript + TanStack Router (port 5173)
- **Backend**: Fastify server with Redis caching (port 4500)
- **Storage**: Walrus decentralized network via official endpoints
- **Health Monitoring**: Automatic endpoint health checking and failover
- **State Management**: Zustand with DevTools
- **UI**: Shadcn/ui components with Tailwind CSS

## Development Commands

### Frontend Commands

```bash
# Start frontend development server
bun run dev

# Build frontend
bun run build

# Run tests
bun run test

# Lint code
bun run lint

# Format code
bun run format

# Format and fix linting
bun run check
```

### Backend Commands

```bash
# Start backend server (from cdn-server directory)
cd cdn-server
bun dev

# Build backend
bun run build

# Start production server
bun start

# Lint backend
bun run lint

# Format backend
bun run format
```

### Full Development Setup

```bash
# Start both frontend and backend
bun run dev:all

# Or run separately:
bun run dev:frontend  # Frontend only
bun run dev:server    # Backend only
```

## Key Configuration

### Environment Variables

Backend requires these environment variables (create `.env` in project root):

- `TUSKY_API_KEY`: Required for Tusky.io integration
- `TUSKY_API_URL`: Tusky API endpoint (default: https://api.tusky.io)
- `REDIS_URL`: Redis connection string (default: redis://localhost:6379)
- `PORT`: Server port (default: 4500)

### TypeScript Configuration

- Uses strict mode with bundler module resolution
- Path aliases: `@/*` maps to `./src/*`
- Targets ES2022 with React JSX transform

## Code Architecture

### Frontend Structure

- `src/components/`: React components (Dashboard, UploadManager, CacheManager, etc.)
- `src/routes/`: TanStack Router route components
- `src/store/wcdnStore.ts`: Zustand store with API actions and state management
- `src/lib/utils.ts`: Utility functions

### Backend Structure

- `cdn-server/src/routes/`: API endpoints (cdn.ts, api.ts, upload.ts)
- `cdn-server/src/services/`: Business logic (cache.ts, analytics.ts, tusky.ts, walrus.ts)
- `cdn-server/src/config/`: Configuration with Zod validation
- `cdn-server/src/types/`: TypeScript type definitions

### Key Services

- **Cache Service**: Redis + memory fallback with TTL management
- **Analytics Service**: Request tracking and performance metrics
- **Tusky Service**: File upload to Walrus via Tusky.io API
- **Walrus Service**: CDN content retrieval with aggregator fallback

## API Endpoints

### CDN Routes

- `GET /cdn/:cid` - Serve cached Walrus content
- `GET /api/stats/:cid` - Get analytics for specific CID
- `GET /api/metrics` - Global CDN metrics

### Upload Routes

- `POST /upload/file` - Upload file to Walrus
- `GET /upload/vaults` - List vaults
- `GET /upload/files` - List files in vault

### Cache Management

- `POST /api/preload` - Preload CIDs into cache
- `POST /api/pin/:cid` - Pin CID to prevent eviction
- `POST /api/cache/clear` - Clear entire cache

## State Management

The frontend uses Zustand store (`wcdnStore.ts`) with:

- API state (loading, error handling)
- Cache analytics (CID stats, global metrics)
- Upload management (vaults, files, progress tracking)
- DevTools integration for debugging

## Dependencies

### Frontend Key Dependencies

- React 19, TypeScript, TanStack Router/Query
- Zustand for state management
- Tailwind CSS + Shadcn/ui components
- Tusky.io TypeScript SDK

### Backend Key Dependencies

- Fastify web framework
- Redis for caching (with ioredis client)
- Axios for HTTP requests
- Zod for configuration validation

## Testing

- Frontend: Vitest with React Testing Library
- Backend: Vitest for unit tests
- Run tests with `bun run test` in respective directories

## Code Style

- ESLint: TanStack configuration
- Prettier: Semi-false, single quotes, trailing commas
- TypeScript: Strict mode enabled
- Path aliases configured for clean imports
