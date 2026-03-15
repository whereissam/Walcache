<div align="center">
  <img src="https://github.com/whereissam/Walcache/blob/main/src/assets/walcache-logo.jpeg?raw=true" alt="Walcache Logo" width="120" height="120" />

  # Walcache — Walrus Developer Platform

  **Developer toolkit for building on Walrus decentralized storage**

  *SDK, CLI, analytics, verification, and deploy tooling for the Walrus ecosystem*

  [![GitHub](https://img.shields.io/badge/GitHub-Walcache-blue?style=flat-square&logo=github)](https://github.com/whereissam/Walcache)
  [![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

</div>

![](https://i.imgur.com/Tg9D5UZ.jpeg)

---

## What is Walcache?

Walcache is the **developer platform for Walrus** — think "Pinata for Walrus" or "Vercel for decentralized storage."

Walrus handles storage. Pipe Network handles delivery. **Walcache is the control plane** — the SDK, CLI, analytics, verification, and tooling that makes building on Walrus fast and production-ready.

```
Walrus       → storage (data plane)
Pipe Network → delivery (CDN plane)
Walcache     → developer platform (control plane)
               ├── SDK (@walcache/sdk)
               ├── CLI (@walcache/cli)
               ├── Analytics dashboard
               ├── Multi-chain verification
               ├── Seal encryption / access control
               ├── Aggregator failover
               └── Intelligent caching
```

## Quick Start

```bash
git clone https://github.com/whereissam/Walcache.git
cd Walcache && bun install

echo 'API_KEY_SECRET=your-secret-key-minimum-32-characters-long' > .env

bun run dev:all
```

- **Dashboard**: http://localhost:5173
- **API**: http://localhost:4500
- **Docs**: http://localhost:4500/documentation

## SDK

```javascript
import { getWalrusCDNUrl, WalrusCDNClient } from '@walcache/sdk'

// One-liner: get a Walrus URL
const url = getWalrusCDNUrl('your-blob-id', { chain: 'sui' })

// Full client
const client = new WalrusCDNClient({
  baseUrl: 'https://your-instance.com',
  apiKey: 'your-api-key',
})

await client.uploadFile(file)
await client.getCIDInfo('blob-id')
await client.verifyMultiChain(['ethereum', 'sui'], 'blob-id')
```

## CLI

```bash
walcache init                    # Interactive setup
walcache upload file.jpg         # Upload to Walrus
walcache deploy                  # Deploy static site to Walrus
walcache cache preload <blob-id> # Warm the cache
walcache status                  # Check health
walcache analytics               # View metrics
```

## Architecture

| Layer | Component | Stack |
|-------|-----------|-------|
| Frontend | Dashboard + analytics | React 19, TanStack Router, Zustand, Shadcn/ui |
| Backend | API + caching + verification | Fastify, Redis, Node Cache, Disk Persistence |
| Storage | Walrus integration | Walrus (erasure-coded), Tusky.io uploads |
| Blockchain | On-chain verification | Ethereum (Solidity), Sui (Move) |
| Developer Tools | SDK + CLI | TypeScript, Commander.js |

## Documentation

| Doc | What it covers |
|-----|---------------|
| **[Market Research](./docs/MARKET_RESEARCH.md)** | Strategic assessment, ecosystem data, positioning analysis |
| **[Roadmap](./docs/TODO.md)** | Prioritized feature roadmap |
| **[Architecture](./docs/ARCHITECTURE.md)** | System diagrams and data flows |
| **[API Reference](./docs/API_DOCUMENTATION.md)** | Full endpoint docs |
| **[Self-Hosting](./docs/SELF_HOSTING.md)** | Docker, systemd, nginx, security checklist |
| **[Walrus Integration](./docs/walrus-integration-guide.md)** | Walrus network setup |
| **[SDK Guide](./packages/sdk/README.md)** | Full SDK documentation |
| **[SDK API Reference](./packages/sdk/V1_API_REFERENCE.md)** | V1 API reference |

## Development

```bash
bun run dev:frontend    # Frontend (port 5173)
bun run dev:server      # Backend (port 4500)
bun run dev:all         # Both
bun run test            # Run tests
bun run build:sdk       # Build SDK
```

## License

MIT

## Acknowledgments

- [Walrus](https://walrus.xyz/) — Decentralized storage
- [Pipe Network](https://pipe.network/) — Decentralized CDN
- [Tusky.io](https://tusky.io/) — Walrus integration
- [Mysten Labs](https://mystenlabs.com/) — Sui, Seal, Walrus
