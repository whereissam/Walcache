# Walcache — Walrus Developer Platform Roadmap

Based on [Market Research & Strategic Assessment](./MARKET_RESEARCH.md).

**Core insight:** Walcache is not a CDN. It's the **control plane for Walrus apps** — the developer platform that sits between raw Walrus storage and production applications.

**Progress: 20/29 items complete (69%)**

---

## Phase 0: Reposition (Now)

- [x] Rename positioning: ~~Walrus CDN~~ → **Walrus Developer Platform**
- [ ] Update all messaging: README, docs, SDK descriptions
- [ ] Apply to **Walrus Foundation RFP program** — frame as ecosystem dev tooling
- [ ] Post in Sui/Walrus developer communities, get 5-10 SDK users

---

## Phase 1: Platform Foundations (Month 1-2)

### Already Built
- [x] **SDK** (`@walcache/sdk`) — multi-chain client, one-line URLs, verification, uploads
- [x] **CLI** (`@walcache/cli`) — upload, cache, analytics, config, blockchain commands
- [x] **Pricing tiers** — Free ($0) → Starter ($29) → Professional ($99) → Enterprise ($299)
- [x] **Epoch-aware caching** — `getEpochAwareTTL()` aligns TTL to Walrus epochs
- [x] **Aggregator health monitoring** — `GET /api/health/endpoints` with health scores
- [x] **Cache persistence** — three-tier: Memory → Redis → Disk
- [x] **Self-hosting guide** — `docs/SELF_HOSTING.md`
- [x] **Analytics dashboard** — hit rate, trends, geographic distribution, latency
- [x] **Prometheus export** — `GET /v1/analytics/prometheus`
- [x] **Webhook invalidation** — `POST /api/webhook/cache-invalidate` with HMAC
- [x] **Seal encryption** — routes and service (needs TS fixes for full build)
- [x] **Rate limiting + access control** — per-tier, per-token usage tracking

### To Build
- [x] `walcache deploy` — upload static site to Walrus, auto-detects build dirs (dist/build/out), creates manifest, preloads cache
- [x] `walcache deploy --preview` — preview deployments with unique versioned URLs
- [ ] **Signed URLs** — time-limited, token-gated access to Walrus content
- [ ] Publish `@walcache/sdk` to npm
- [ ] Publish `@walcache/cli` to npm
- [ ] Quickstart tutorial (5-min "hello world")

---

## Phase 2: Developer Experience (Month 3-4)

### Deploy Workflow
- [ ] Custom domain support for deployed sites
- [ ] Git-based deploy (push to deploy)
- [x] Deploy logs and rollback — `DeployLogService` with `POST /v1/deploys`, `GET /v1/deploys/:site`, `POST /v1/deploys/:site/rollback`. Tracks versions, auto-supersedes old deploys, cache warming on rollback. 9 tests.

### Access Control
- [x] NFT-gated access — `AccessGateService` verifies ERC-721 ownership (Ethereum) and Sui object ownership on-chain. `POST /v1/access-gates`, `GET /v1/access-gates/check/:cid?wallet=`. 13 tests.
- [x] Allowlist-based access — same service supports allowlist gates with add/remove wallet endpoints. Case-insensitive matching.
- [x] Time-limited signed URLs with HMAC verification — `POST /api/signed-url` generates tokens, `GET /api/signed-url/verify` validates. IP restriction, custom metadata, configurable expiry (60s–7d). 11 tests.

### Analytics & Observability
- [ ] Cost tracking per blob/project (storage epochs + bandwidth)
- [ ] Error monitoring and alerting
- [ ] SLA monitoring and uptime reporting
- [ ] Usage dashboards per API token

### SDK/CLI Improvements
- [x] React hooks package — `useUpload`, `useBatchUpload`, `useVerifyCrossChain`, `useAccessCheck` + existing `useStats`, `useWalrus`, `useVaults`. Barrel export at `src/hooks/api/index.ts`.
- [ ] Next.js integration guide
- [ ] `walcache logs` — real-time log streaming
- [ ] `walcache analytics` — rich terminal output with charts

---

## Phase 3: Platform Growth (Month 5-8)

### Team & Collaboration
- [ ] Team accounts with role-based access
- [ ] Project-level API keys and analytics
- [ ] Audit trail for compliance reporting

### Multi-Protocol (Later)
- [ ] Abstract storage backend interface
- [ ] IPFS backend support (content-addressed retrieval)
- [ ] Arweave backend support (permanent storage gateway)

### Enterprise
- [ ] Enterprise SLA tiers
- [ ] Dedicated infrastructure option
- [ ] SSO/SAML authentication

---

## Competitive Positioning

Walcache complements (not competes with) the Walrus stack:

| Layer | Who | Role |
|-------|-----|------|
| Storage | **Walrus** | Erasure-coded blob storage |
| Delivery | **Pipe Network** | 280K PoP nodes, sub-50ms CDN |
| Uploads | **Tusky.io** | Upload management, vaults |
| **Developer Platform** | **Walcache** | SDK, CLI, analytics, verification, deploy, access control |

Nobody else is building the control plane. Fleek and Pinata don't support Walrus. Pipe Network is delivery-only. Tusky is upload-only.

---

## Grant Strategy

| Target | What to pitch | Priority |
|--------|--------------|----------|
| **Walrus Foundation RFP** | Developer platform: SDK, CLI, analytics, deploy tooling | Highest |
| **Sui Foundation grants** | Ecosystem tooling for Sui developers using Walrus | High |
| Standard Crypto / a16z (warm intro) | If grant succeeds, approach for seed funding | Later |

---

## Key Metrics

| Metric | Target |
|--------|--------|
| SDK npm downloads/week | 100+ |
| Projects using Walcache | 10+ |
| `walcache deploy` sites hosted | 20+ |
| Cache hit rate | >90% |
| Grant funding secured | $50K-$150K |
