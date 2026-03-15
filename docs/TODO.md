# Walcache/WCDN Strategic TODO

Based on [Market Research](./MARKET_RESEARCH.md) findings. Prioritized by impact and urgency.

---

## Phase 1: Foundation & Ecosystem (Month 1-2)

### Funding & Partnerships
- [ ] Apply to **Sui Foundation ecosystem grants** (highest priority, lowest friction)
- [ ] Prepare investor deck: full product built, Walrus first-mover, bridge narrative, DePIN alignment
- [ ] Seek warm intros to **a16z Crypto** and **Lightspeed Faction** (direct Mysten Labs backers)
- [ ] Research and contact **Multicoin Capital**, **Hack VC**, **Placeholder VC** as thesis-aligned infra funds

### Product Hardening
- [x] Define and implement **usage-based pricing tiers**: Free ($0) → Starter ($29) → Professional ($99) → Enterprise ($299) with per-tier rate limits, bandwidth, and storage caps. Public endpoint at `GET /api/pricing`.
- [x] Add **epoch-aware cache TTL** - `CacheService.getEpochAwareTTL()` aligns TTL to remaining time in current Walrus epoch. Configurable via `WALRUS_EPOCH_DURATION`.
- [x] Improve aggregator health monitoring - `GET /api/health/endpoints` exposes per-aggregator/publisher health, response times, and network score (public, no auth).
- [x] Add **cache persistence layer** - pinned/high-value blobs persisted to disk (`CACHE_PERSISTENCE_DIR`), restored on startup, survives Redis/memory failures. Three-tier: Memory → Redis → Disk.
- [x] Document self-hosting guide - `docs/SELF_HOSTING.md` with Docker, Docker Compose, systemd, nginx, security checklist, monitoring.

### Developer Experience
- [ ] Publish SDK to npm as `@wcdn/sdk`
- [ ] Publish CLI to npm as `@wcdn/cli`
- [ ] Create quickstart tutorial (5-min "hello world" with Walrus + WCDN)
- [ ] Submit WCDN to Sui/Walrus ecosystem directories and docs

---

## Phase 2: Differentiation & Growth (Month 3-6)

### Deepen Walrus-Specific Features (Widen Moat)
- [ ] **Seal encryption integration** - complete the access-controlled CDN flow end-to-end
- [ ] **Blob availability prediction** - predict availability based on epoch/node patterns
- [ ] **Smart prefetching** - anticipate content requests based on analytics patterns
- [ ] **Geographic-aware caching** - region hints for data residency compliance
- [ ] **Webhook-driven cache invalidation** - production-ready event-driven architecture

### Content Moderation & Compliance
- [ ] Implement DMCA takedown mechanism at CDN layer
- [ ] Add configurable content filtering (required for enterprise/regulated markets)
- [ ] Build audit trail export for compliance reporting
- [ ] Document GDPR approach (epoch-based storage = natural deletion path)

### Analytics & Observability
- [ ] Enhanced analytics dashboard with blockchain metrics
- [ ] Cost tracking per blob/project (storage epochs + CDN bandwidth)
- [ ] SLA monitoring and uptime reporting
- [ ] Export analytics data for billing integration

### Community & Adoption
- [ ] Build example integrations: NFT marketplace, gaming asset CDN, document verification
- [ ] Write technical blog posts for Sui/Walrus community
- [ ] Contribute upstream to Walrus tooling (build ecosystem relationship)
- [ ] Launch managed/hosted WCDN offering alongside open-source

---

## Phase 3: Multi-Protocol Expansion (Month 6-12)

> Multi-protocol support is the **single largest SOM expansion lever** (2-3x near-term SAM)

### Architecture for Multi-Protocol
- [ ] Abstract storage backend interface (Walrus today, pluggable tomorrow)
- [ ] Add **IPFS** backend support (content-addressed retrieval)
- [ ] Add **Arweave** backend support (permanent storage gateway)
- [ ] Add **Filecoin/Saturn** backend support
- [ ] Unified blob ID resolution across protocols

### Enterprise Features
- [ ] Enterprise SLA tiers with guaranteed uptime
- [ ] Dedicated infrastructure option (private aggregators)
- [ ] SSO/SAML authentication for team management
- [ ] Custom domain support for CDN endpoints
- [ ] Advanced rate limiting and access control policies

### Scale & Performance
- [ ] Edge caching (deploy cache nodes closer to users)
- [ ] CDN performance benchmarks vs Cloudflare/Pinata (publish results)
- [ ] Load testing and capacity planning documentation
- [ ] Horizontal scaling guide for high-traffic deployments

---

## Competitive Threats to Monitor

| Threat | Check Frequency | Action Trigger |
|--------|----------------|---------------|
| Mysten Labs building first-party CDN | Monthly | Accelerate differentiation on DX/analytics |
| Fleek/Pinata adding Walrus support | Monthly | Deepen Walrus-specific features they can't replicate |
| Walrus adoption metrics | Quarterly | If stalling, accelerate multi-protocol support |
| New Walrus CDN competitors | Monthly | Analyze positioning gaps |

---

## Key Metrics to Track

### Product Metrics
- Monthly active projects using WCDN
- Cache hit rate (target: >90%)
- P95 latency (cached vs uncached)
- Total blobs served / bandwidth

### Business Metrics
- ARR / MRR
- Paying customers by tier
- Customer acquisition cost
- Churn rate

### Ecosystem Metrics
- Walrus network storage volume growth
- Sui developer population growth
- Competitor activity (new entrants, feature launches)

---

## Revenue Targets (Base Case)

| Period | Paying Customers | ARR Target |
|--------|-----------------|------------|
| Year 1 | 10-30 | $100K-$200K |
| Year 2 | 50-120 | $800K-$1.5M |
| Year 3 | 100-300+ | $2M-$5M |

See [Market Research](./MARKET_RESEARCH.md) for detailed TAM/SAM/SOM analysis and sensitivity scenarios.
