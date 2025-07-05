# WCDN Architecture Chart

## 🏗️ System Overview

> **Core Design Principle**: WCDN leverages Walrus's immutable blob storage where content is identified by cryptographic hashes (blobIds). File "updates" always generate new blobIds, ensuring content immutability, natural versioning, and cache safety.

## 📝 Key Concepts

### Immutability & Versioning
- **Content Immutability**: All Walrus blobs are immutable; changing content creates a new blobId
- **Automatic Versioning**: Each file change generates a new version with a unique blobId
- **Cache Safety**: Cache invalidation removes old blobId entries, never overwrites content
- **Metadata Pointers**: Tusky manages version pointers and file metadata

### Consistency Guarantees
- **Eventual Consistency**: Cache invalidation propagates across nodes within ~5-10 seconds
- **Strong Consistency**: Content retrieval by blobId is always consistent (immutable)
- **Metadata Consistency**: Tusky ensures file metadata and version pointers are consistent

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              WCDN (Walrus CDN)                                  │
│                         High-Performance Decentralized CDN                      │
└─────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
   │   End Users     │    │   Developers    │    │  Admin Users    │
   │                 │    │                 │    │                 │
   │ • File Access   │    │ • API Access    │    │ • Management    │
   │ • CDN URLs      │    │ • SDK Usage     │    │ • Monitoring    │
   └─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
             │                      │                      │
             ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Frontend Layer                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Dashboard     │  │  CID Explorer   │  │  Upload Manager │                  │
│  │                 │  │                 │  │                 │                  │
│  │ • Analytics     │  │ • File Search   │  │ • File Upload   │                  │
│  │ • Metrics       │  │ • Metadata      │  │ • Vault Mgmt    │                  │
│  │ • Monitoring    │  │ • Error Handle  │  │ • Bulk Ops      │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│                                                                                 │
│  React 19 + TypeScript + TanStack Router + Zustand + Shadcn/ui                 │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Security Layer                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        Authentication Middleware                            │ │
│  │                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │ │
│  │  │   API Key Auth  │  │  Rate Limiting  │  │  CORS Control   │              │ │
│  │  │                 │  │                 │  │                 │              │ │
│  │  │ • X-API-Key     │  │ • 1000/min Auth │  │ • Origin Check  │              │ │
│  │  │ • Required Ops  │  │ • 100/min Anon  │  │ • Headers       │              │ │
│  │  │ • Validation    │  │ • IP-based      │  │ • Methods       │              │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘              │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Backend Layer                                      │
│                            Fastify Server                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                            Route Handlers                                   │ │
│  │                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │ │
│  │  │   CDN Routes    │  │  Upload Routes  │  │   API Routes    │              │ │
│  │  │                 │  │                 │  │                 │              │ │
│  │  │ • GET /cdn/:cid │  │ • POST /file    │  │ • POST /preload │              │ │
│  │  │ • Cache Lookup  │  │ • POST /vaults  │  │ • PIN/UNPIN     │              │ │
│  │  │ • Aggregator    │  │ • DELETE files  │  │ • Cache Mgmt    │              │ │
│  │  │ • IPFS Fallback │  │ • GET /health   │  │ • Analytics     │              │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘              │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                           │                                     │
│  ┌─────────────────────────────────────────┼─────────────────────────────────────┐ │
│  │                     Service Layer      │                                     │ │
│  │                                        ▼                                     │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │ │
│  │  │  Cache Service  │  │ Walrus Service  │  │  Tusky Service  │              │ │
│  │  │                 │  │                 │  │                 │              │ │
│  │  │ • Redis Cache   │  │ • Multi-Endpoint│  │ • File Upload   │              │ │
│  │  │ • Memory Cache  │  │ • Health Check  │  │ • Vault Mgmt    │              │ │
│  │  │ • Auto Fallback │  │ • Retry Logic   │  │ • API Proxy     │              │ │
│  │  │ • TTL/Pinning   │  │ • Load Balance  │  │ • Metadata Mgmt │              │ │
│  │  │                 │  │                 │  │ • Version Ptr   │              │ │
│  │  │                 │  │                 │  │ • Access Control│              │ │
│  │  │                 │  │                 │  │ • Encryption    │              │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘              │ │
│  │              │                     │                     │                  │ │
│  │              │  ┌─────────────────┐│  ┌─────────────────┐│                  │ │
│  │              │  │ Analytics Svc   ││  │Health Monitor   ││                  │ │
│  │              │  │                 ││  │                 ││                  │ │
│  │              │  │ • Hit/Miss      ││  │ • Endpoint Test ││                  │ │
│  │              │  │ • Latency       ││  │ • Auto Failover ││                  │ │
│  │              │  │ • Usage Stats   ││  │ • Performance   ││                  │ │
│  │              │  │ • Webhooks      ││  │ • Health Score  ││                  │ │
│  │              │  └─────────────────┘│  └─────────────────┘│                  │ │
│  └──────────────┼─────────────────────┼─────────────────────┼──────────────────┘ │
└─────────────────┼─────────────────────┼─────────────────────┼────────────────────┘
                  │                     │                     │
                  ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Storage Layer                                      │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Redis Cache   │  │   Memory Cache  │  │   Walrus Network│                  │
│  │                 │  │                 │  │                 │                  │
│  │ • Primary Cache │  │ • Fallback      │  │ • Blob Storage  │                  │
│  │ • Fast Access   │  │ • No Redis Deps │  │ • Decentralized │                  │
│  │ • Persistence   │  │ • TTL Support   │  │ • Content Hash  │                  │
│  │ • Clustering    │  │ • LRU Eviction  │  │ • Immutable     │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│                                                      │                          │
│                           ┌─────────────────────────┴─────────────────────────┐ │
│                           │          Walrus Infrastructure                     │ │
│                           │                                                     │ │
│  ┌─────────────────────────┼─────────────────────────────────────────────────────┤ │
│  │                         ▼                                                     │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │ │
│  │  │   Publishers    │  │   Aggregators   │  │   IPFS Gateway  │              │ │
│  │  │                 │  │                 │  │                 │              │ │
│  │  │ • testnet.space │  │ • testnet.space │  │ • ipfs.io       │              │ │
│  │  │ • atalma.io     │  │ • atalma.io     │  │ • Fallback      │              │ │
│  │  │ • bwarelabs.com │  │ • bwarelabs.com │  │ • Redundancy    │              │ │
│  │  │ • chainbase.com │  │ • chainbase.com │  │ • Legacy Compat │              │ │
│  │  │ • everstake.one │  │ • everstake.one │  │                 │              │ │
│  │  │ • (+ 4 more)    │  │ • (+ 5 more)    │  │                 │              │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘              │ │
│  │              │                     │                     │                  │ │
│  │              │  ┌─────────────────┐│                     │                  │ │
│  │              │  │   Tusky.io      ││                     │                  │ │
│  │              │  │                 ││                     │                  │ │
│  │              │  │ • Upload Proxy  ││                     │                  │ │
│  │              │  │ • Vault System  ││                     │                  │ │
│  │              │  │ • Encryption    ││                     │                  │ │
│  │              │  │ • File Mgmt     ││                     │                  │ │
│  │              │  └─────────────────┘│                     │                  │ │
│  └──────────────┼─────────────────────┼─────────────────────┼──────────────────┘ │
└─────────────────┼─────────────────────┼─────────────────────┼────────────────────┘
                  │                     │                     │
                  ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              External Services                                  │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Webhooks      │  │   Monitoring    │  │   Analytics     │                  │
│  │                 │  │                 │  │                 │                  │
│  │ • File Events   │  │ • Health Alerts │  │ • Usage Reports │                  │
│  │ • Cache Events  │  │ • Performance   │  │ • Metrics       │                  │
│  │ • System Events │  │ • Uptime Track  │  │ • Dashboards    │                  │
│  │ • Custom Hooks  │  │ • Error Logging │  │ • Export APIs   │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagrams

### 1. File Upload Flow

> **Note**: File uploads always generate new immutable blobIds. File "updates" create new versions with new blobIds, ensuring content immutability and cache safety.

```
User Interface
      │
      │ 1. Select Files & Vault
      ▼
┌─────────────────┐    2. Multipart Form    ┌─────────────────┐
│  React Upload   │─────────────────────────▶│  Backend API    │
│  Component      │                          │  /upload/file   │
└─────────────────┘                          └─────────┬───────┘
                                                       │
                                                       │ 3. Auth Check
                                                       ▼
                                             ┌─────────────────┐
                                             │  Auth Middleware│
                                             │  (API Key)      │
                                             └─────────┬───────┘
                                                       │
                                                       │ 4. Forward to Tusky
                                                       ▼
┌─────────────────┐    5. Blob ID Return    ┌─────────────────┐
│   Tusky.io API │◀─────────────────────────│  Tusky Service  │
│                 │                          │                 │
│ • File Upload   │─────────────────────────▶│ • API Proxy     │
│ • Vault Mgmt    │    6. Store in Vault     │ • File Metadata │
│ • Blob Storage  │    (NEW blobId created)  │ • Version Ptr   │
│ • Immutable     │                          │ • Error Handle  │
└─────────────────┘                          └─────────┬───────┘
          │                                           │
          │ 7. Store on Walrus                        │ 8. Cache File
          ▼                                           ▼
┌─────────────────┐                          ┌─────────────────┐
│ Walrus Network  │                          │  Cache Service  │
│                 │                          │                 │
│ • Decentralized │                          │ • Redis Store   │
│ • Content Hash  │                          │ • Memory Store  │
│ • Immutable     │                          │ • TTL Setting   │
│ • Redundant     │                          │ • Auto Evict   │
└─────────────────┘                          └─────────┬───────┘
                                                       │
                                                       │ 9. Return CDN URL
                                                       ▼
                                             ┌─────────────────┐
                                             │  Frontend UI    │
                                             │                 │
                                             │ • Show Success  │
                                             │ • Display URL   │
                                             │ • Cache Status  │
                                             │ • Enable Mgmt   │
                                             └─────────────────┘
```

### 2. CDN Access Flow

```
End User Request
      │
      │ 1. GET /cdn/{blobId}
      ▼
┌─────────────────┐    2. Route Handler    ┌─────────────────┐
│   CDN Endpoint  │─────────────────────────▶│  Cache Service  │
│   /cdn/:cid     │                          │                 │
└─────────────────┘                          └─────────┬───────┘
                                                       │
                                                       │ 3. Cache Lookup
                                                       ▼
                                             ┌─────────────────┐
                                             │   Cache Hit?    │
                                             │                 │
                                             │ ┌─────────────┐ │
                                             │ │    Redis    │ │
                                             │ └─────────────┘ │
                                             │ ┌─────────────┐ │
                                             │ │   Memory    │ │
                                             │ └─────────────┘ │
                                             └─────┬─────┬─────┘
                                                   │     │
                                              HIT  │     │ MISS
                                                   │     │
                          ┌────────────────────────┘     └──────────────┐
                          │                                             │
                          ▼                                             ▼
                ┌─────────────────┐                           ┌─────────────────┐
                │  Return Cached  │                           │ Walrus Service  │
                │                 │                           │                 │
                │ • File Content  │                           │ • Health Check  │
                │ • Headers       │                           │ • Load Balance  │
                │ • X-Cache: HIT  │                           │ • Multi-Endpoint│
                │ • Analytics     │                           │ • Retry Logic   │
                └─────────────────┘                           └─────────┬───────┘
                                                                        │
                                                                        │ 4. Fetch from Best Aggregator
                                                                        ▼
                                                              ┌─────────────────┐
                                                              │ Endpoint Health │
                                                              │    Monitor      │
                                                              │                 │
                                                              │ • Response Time │
                                                              │ • Success Rate  │
                                                              │ • Auto Failover │
                                                              │ • Health Score  │
                                                              └─────────┬───────┘
                                                                        │
                                                                        │ 5. Select Best Endpoint
                                                                        ▼
┌─────────────────┐    6. Fetch Content     ┌─────────────────┐         │
│ Walrus Aggregator│◀─────────────────────────│  HTTP Request   │◀────────┘
│                 │                          │                 │
│ • Blob Storage  │─────────────────────────▶│ • Timeout: 10s  │
│ • Content Hash  │    7. Return Blob        │ • Retry: 3x     │
│ • Decentralized │                          │ • Error Handle  │
└─────────────────┘                          └─────────┬───────┘
          │                                           │
          │ 8. Success                                 │ 9. Cache & Return
          ▼                                           ▼
┌─────────────────┐                          ┌─────────────────┐
│   IPFS Gateway  │                          │  Response       │
│    (Fallback)   │                          │                 │
│                 │                          │ • File Content  │
│ • ipfs.io       │                          │ • Content-Type  │
│ • Redundancy    │                          │ • X-Cache:MISS  │
│ • Legacy Compat │                          │ • X-Source      │
└─────────────────┘                          │ • Cache Store   │
                                             │ • Analytics     │
                                             └─────────────────┘
```

### 3. Cache Invalidation Flow

```
File Operations
      │
      │ 1. File Deleted/Updated
      ▼
┌─────────────────┐    2. Detect Change    ┌─────────────────┐
│  Upload Route   │─────────────────────────▶│ Cache Service   │
│  DELETE /files  │                          │                 │
└─────────────────┘                          └─────────┬───────┘
                                                       │
                                                       │ 3. Auto Invalidate
                                                       ▼
┌─────────────────┐    4. Manual Ops       ┌─────────────────┐
│   Admin API     │─────────────────────────▶│ Invalidation    │
│                 │                          │    Engine       │
│ • DELETE /cache │                          │                 │
│ • POST /inval   │                          │ • Single CID    │
│ • Bulk Ops      │                          │ • Bulk CIDs     │
└─────────────────┘                          │ • Webhook Hooks │
                                             └─────────┬───────┘
                                                       │
                                                       │ 5. Cache Removal
                                                       ▼
                                             ┌─────────────────┐
                                             │  Storage Clear  │
                                             │                 │
                                             │ ┌─────────────┐ │
                                             │ │    Redis    │ │
                                             │ │   DELETE    │ │
                                             │ └─────────────┘ │
                                             │ ┌─────────────┐ │
                                             │ │   Memory    │ │
                                             │ │   REMOVE    │ │
                                             │ └─────────────┘ │
                                             └─────────┬───────┘
                                                       │
                                                       │ 6. Event Hooks
                                                       ▼
┌─────────────────┐    7. Notify External   ┌─────────────────┐
│ External Systems│◀─────────────────────────│   Webhook API   │
│                 │                          │                 │
│ • Monitoring    │                          │ • Cache Events  │
│ • Analytics     │                          │ • File Events   │
│ • CI/CD         │                          │ • System Events │
│ • Alerts        │                          │ • Custom Hooks  │
└─────────────────┘                          └─────────────────┘
```

### 4. Health Monitoring Flow

```
System Startup
      │
      │ 1. Initialize Health Monitor
      ▼
┌─────────────────┐    2. Start Monitoring  ┌─────────────────┐
│ Endpoint Health │─────────────────────────▶│  Walrus Config  │
│    Service      │                          │                 │
└─────────┬───────┘                          └─────────┬───────┘
          │                                           │
          │ 3. Read Official Endpoints                 │ 4. Return Endpoint Lists
          ▼                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Health Check Cycle                                    │
│                             (Every 5 minutes)                                   │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Aggregators   │  │   Publishers    │  │   Metrics       │                  │
│  │                 │  │                 │  │                 │                  │
│  │ • HEAD /blobs   │  │ • HEAD /        │  │ • Response Time │                  │
│  │ • Expect 404    │  │ • Any Status    │  │ • Success Rate  │                  │
│  │ • Timeout: 5s   │  │ • Timeout: 5s   │  │ • Error Details │                  │
│  │ • Track Latency │  │ • Track Latency │  │ • Health Score  │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│              │                     │                     │                      │
│              ▼                     ▼                     ▼                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                         Health Assessment                                   │ │
│  │                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │ │
│  │  │  Calculate      │  │   Update        │  │   Log Status    │              │ │
│  │  │  Health Score   │  │   Health Map    │  │                 │              │ │
│  │  │                 │  │                 │  │ • Healthy: 9/10 │              │ │
│  │  │ • Response Time │  │ • Mark Healthy  │  │ • Failed: 1/10  │              │ │
│  │  │ • Success Rate  │  │ • Mark Failed   │  │ • Performance   │              │ │
│  │  │ • Error Count   │  │ • Track Perf    │  │ • Alerts        │              │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘              │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────────────────────┘
                          │
                          │ 5. Provide Best Endpoints
                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Endpoint Selection                                     │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Walrus Service │  │  CDN Routes     │  │  Upload Routes  │                  │
│  │                 │  │                 │  │                 │                  │
│  │ • getBestAgg()  │  │ • Fetch Blobs   │  │ • Store Files   │                  │
│  │ • getBestPub()  │  │ • Serve Content │  │ • Manage Vaults │                  │
│  │ • getHealthy()  │  │ • Cache Mgmt    │  │ • File Ops      │                  │
│  │ • Auto Failover │  │ • Error Handle  │  │ • User Auth     │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🛡️ Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Security Layers                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
   │  Unauthenticated│    │   Authenticated │    │    Admin        │
   │     Users       │    │     Users       │    │   Operations    │
   │                 │    │                 │    │                 │
   │ • CDN Access    │    │ • File Upload   │    │ • Cache Mgmt    │
   │ • Public APIs   │    │ • Vault Mgmt    │    │ • System Ops    │
   │ • Health Check  │    │ • File Delete   │    │ • Analytics     │
   └─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
             │                      │                      │
             ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Request Processing                                      │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                           Rate Limiting                                     │ │
│  │                                                                             │ │
│  │    ┌─────────────────┐         ┌─────────────────┐                          │ │
│  │    │  Anonymous      │         │  Authenticated  │                          │ │
│  │    │                 │         │                 │                          │ │
│  │    │ • 100 req/min   │         │ • 1000 req/min  │                          │ │
│  │    │ • IP-based      │         │ • API-key based │                          │ │
│  │    │ • Basic limits  │         │ • Higher limits │                          │ │
│  │    └─────────────────┘         └─────────────────┘                          │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                           │                                     │
│  ┌─────────────────────────────────────────┼─────────────────────────────────────┐ │
│  │                   Authentication        │                                     │ │
│  │                                        ▼                                     │ │
│  │    ┌─────────────────┐         ┌─────────────────┐                          │ │
│  │    │   Optional      │         │    Required     │                          │ │
│  │    │     Auth        │         │      Auth       │                          │ │
│  │    │                 │         │                 │                          │ │
│  │    │ • CDN Access    │         │ • File Upload   │                          │ │
│  │    │ • Public APIs   │         │ • Vault Create  │                          │ │
│  │    │ • Health        │         │ • File Delete   │                          │ │
│  │    │ • Analytics     │         │ • Cache Mgmt    │                          │ │
│  │    └─────────────────┘         └─────────────────┘                          │ │
│  │             │                            │                                  │ │
│  │             ▼                            ▼                                  │ │
│  │    ┌─────────────────┐         ┌─────────────────┐                          │ │
│  │    │   Set user =    │         │  Validate       │                          │ │
│  │    │  { auth: false }│         │  X-API-Key      │                          │ │
│  │    └─────────────────┘         └─────────┬───────┘                          │ │
│  │                                          │                                  │ │
│  │                                          ▼                                  │ │
│  │                                ┌─────────────────┐                          │ │
│  │                                │  Valid Key?     │                          │ │
│  │                                │                 │                          │ │
│  │                                │ ┌─────────────┐ │                          │ │
│  │                                │ │     YES     │ │                          │ │
│  │                                │ │             │ │                          │ │
│  │                                │ │ Set user =  │ │                          │ │
│  │                                │ │ {auth:true} │ │                          │ │
│  │                                │ └─────────────┘ │                          │ │
│  │                                │ ┌─────────────┐ │                          │ │
│  │                                │ │     NO      │ │                          │ │
│  │                                │ │             │ │                          │ │
│  │                                │ │ Return 401/ │ │                          │ │
│  │                                │ │ 403 Error   │ │                          │ │
│  │                                │ └─────────────┘ │                          │ │
│  │                                └─────────────────┘                          │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                           │                                     │
│  ┌─────────────────────────────────────────┼─────────────────────────────────────┐ │
│  │                      CORS               │                                     │ │
│  │                                        ▼                                     │ │
│  │    ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│  │    │                    Origin Validation                                   │ │ │
│  │    │                                                                         │ │ │
│  │    │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │ │ │
│  │    │  │   Localhost     │  │  Development    │  │   Production    │          │ │ │
│  │    │  │                 │  │                 │  │                 │          │ │ │
│  │    │  │ • localhost:4500│  │ • localhost:5173│  │ • yourdomain.com│          │ │ │
│  │    │  │ • 127.0.0.1     │  │ • dev.site.com  │  │ • api.site.com  │          │ │ │
│  │    │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │ │ │
│  │    └─────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                           │                                     │
│  ┌─────────────────────────────────────────┼─────────────────────────────────────┐ │
│  │                   Validation            │                                     │ │
│  │                                        ▼                                     │ │
│  │    ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│  │    │                     Input Validation                                   │ │ │
│  │    │                                                                         │ │ │
│  │    │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │ │ │
│  │    │  │  Zod Schemas    │  │  File Validation│  │  CID Validation │          │ │ │
│  │    │  │                 │  │                 │  │                 │          │ │ │
│  │    │  │ • Type Safety   │  │ • Size Limits   │  │ • Format Check  │          │ │ │
│  │    │  │ • Field Rules   │  │ • Type Check    │  │ • Length Check  │          │ │ │
│  │    │  │ • Error Format  │  │ • Security Scan │  │ • Char Allowed  │          │ │ │
│  │    │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │ │ │
│  │    └─────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Cache Synchronization Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Cache Synchronization System                            │
└─────────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │   File Events   │
                         │                 │
                         │ • Upload        │
                         │ • Update        │
                         │ • Delete        │
                         │ • Rename        │
                         └─────────┬───────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Event Detection Layer                                   │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Upload Route   │  │  Delete Route   │  │  Manual API     │                  │
│  │                 │  │                 │  │                 │                  │
│  │ • Auto Cache    │  │ • Auto Inval    │  │ • Admin Ops     │                  │
│  │ • New Files     │  │ • File Removal  │  │ • Bulk Ops      │                  │
│  │ • Metadata      │  │ • Old blob ID   │  │ • Force Clear   │                  │
│  └─────────┬───────┘  └─────────┬───────┘  └─────────┬───────┘                  │
│            │                    │                    │                          │
│            ▼                    ▼                    ▼                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     Cache Invalidation Engine                               │ │
│  │                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │ │
│  │  │   Automatic     │  │     Manual      │  │    Webhook      │              │ │
│  │  │  Invalidation   │  │  Invalidation   │  │  Invalidation   │              │ │
│  │  │                 │  │                 │  │                 │              │ │
│  │  │ • File Delete   │  │ • DELETE /cache │  │ • External Sys  │              │ │
│  │  │ • File Update   │  │ • POST /inval   │  │ • CI/CD Events  │              │ │
│  │  │ • Vault Delete  │  │ • Bulk Clear    │  │ • Admin Tools   │              │ │
│  │  └─────────┬───────┘  └─────────┬───────┘  └─────────┬───────┘              │ │
│  │            │                    │                    │                      │ │
│  │            └────────────────────┼────────────────────┘                      │ │
│  │                                 ▼                                           │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    Cache Removal Operations                             │ │ │
│  │  │                                                                         │ │ │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │ │ │
│  │  │  │   Single CID    │  │   Bulk CIDs     │  │   Pattern       │          │ │ │
│  │  │  │                 │  │                 │  │   Based         │          │ │ │
│  │  │  │ • Key: blob:cid │  │ • Array of CIDs │  │ • Prefix Match  │          │ │ │
│  │  │  │ • Redis DEL     │  │ • Batch Ops     │  │ • Wildcard      │          │ │ │
│  │  │  │ • Memory DEL    │  │ • Error Track   │  │ • User Files    │          │ │ │
│  │  │  │ • Pin Check     │  │ • Success Count │  │ • Vault Clear   │          │ │ │
│  │  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Storage Layer Operations                                │
│                                                                                 │
│  ┌─────────────────┐                          ┌─────────────────┐               │
│  │   Redis Cache   │                          │  Memory Cache   │               │
│  │                 │                          │                 │               │
│  │ • DEL blob:*    │                          │ • cache.del()   │               │
│  │ • DEL pin:*     │                          │ • LRU Eviction  │               │
│  │ • Batch DEL     │                          │ • Key Removal   │               │
│  │ • Error Handle  │                          │ • Stats Update  │               │
│  │ • Persistence   │                          │ • Fast Access   │               │
│  └─────────┬───────┘                          └─────────┬───────┘               │
│            │                                            │                       │
│            ▼                                            ▼                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                          Verification Layer                                 │ │
│  │                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │ │
│  │  │   Confirm Del   │  │   Log Events    │  │   Update Stats  │              │ │
│  │  │                 │  │                 │  │                 │              │ │
│  │  │ • Key Missing   │  │ • Invalidated   │  │ • Cache Misses  │              │ │
│  │  │ • Both Stores   │  │ • Timestamp     │  │ • Hit Rates     │              │ │
│  │  │ • Success Flag  │  │ • User/System   │  │ • Performance   │              │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘              │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Event Propagation                                    │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Webhooks      │  │   Analytics     │  │   Monitoring    │                  │
│  │                 │  │                 │  │                 │                  │
│  │ • Cache Events  │  │ • Usage Update  │  │ • System Health │                  │
│  │ • File Events   │  │ • Hit Rate Calc │  │ • Alert Trigger │                  │
│  │ • System Events │  │ • Perf Metrics  │  │ • Dashboard     │                  │
│  │ • Custom Hooks  │  │ • Report Gen    │  │ • Notifications │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 📊 Performance & Monitoring

### Performance Characteristics

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Performance Metrics                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

Cache Hit Performance:
┌─────────────────┐
│   Redis Hit     │ ~1-2ms    ┌─────────────────┐
│                 │◀──────────│  Memory Hit     │ ~0.1-0.5ms
│ • Network I/O   │           │                 │
│ • Serialization │           │ • Direct Access │
│ • High Speed    │           │ • No Network    │
└─────────────────┘           │ • Fastest       │
                              └─────────────────┘

Cache Miss Performance:
┌─────────────────┐
│ Walrus Fetch    │ ~100-500ms
│                 │
│ • Multi-endpoint│
│ • Health Check  │
│ • Retry Logic   │
│ • Auto Failover │
└─────────────────┘

Upload Performance:
┌─────────────────┐
│ File Upload     │ ~2-10s
│                 │
│ • File Size     │
│ • Network Speed │
│ • Walrus Sync   │
│ • Auto Cache    │
└─────────────────┘
```

### Monitoring Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Real-time Monitoring                                   │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  System Health  │  │  Cache Metrics  │  │  User Activity  │                  │
│  │                 │  │                 │  │                 │                  │
│  │ • Uptime: 99.9% │  │ • Hit Rate: 85% │  │ • Active: 150   │                  │
│  │ • CPU: 15%      │  │ • Miss: 15%     │  │ • Uploads: 45/h │                  │
│  │ • Memory: 60%   │  │ • Latency: 12ms │  │ • Downloads: 890│                  │
│  │ • Disk: 45%     │  │ • Size: 2.3GB   │  │ • API Calls: 2K │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Walrus Network  │  │  Error Tracking │  │   Performance   │                  │
│  │                 │  │                 │  │                 │                  │
│  │ • Endpoints: 9/10│  │ • 4xx: 12/h    │  │ • P95: 25ms     │                  │
│  │ • Avg Resp: 180ms│  │ • 5xx: 2/h     │  │ • P99: 45ms     │                  │
│  │ • Success: 98.5%│  │ • Timeouts: 1/h │  │ • Throughput:   │                  │
│  │ • Failover: 3x  │  │ • Rate Limit: 0 │  │   1.2K req/min  │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔒 Enhanced Security Features

### API Key Management

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            API Key Lifecycle                                    │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Generation    │  │    Rotation     │  │   Revocation    │                  │
│  │                 │  │                 │  │                 │                  │
│  │ • Secure Random │  │ • Scheduled     │  │ • Immediate     │                  │
│  │ • Entropy Check │  │ • Emergency     │  │ • Audit Trail   │                  │
│  │ • Format Valid  │  │ • Zero Downtime │  │ • Notification  │                  │
│  │ • Audit Log     │  │ • Old Key Grace │  │ • Access Block  │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘

Audit Logging Events:
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Authentication │  │   Operations    │  │  System Events  │
│                 │  │                 │  │                 │
│ • Login Success │  │ • File Upload   │  │ • Cache Clear   │
│ • Login Failure │  │ • File Delete   │  │ • Config Change │
│ • Key Usage     │  │ • Vault Create  │  │ • Error Events  │
│ • Rate Limit    │  │ • Bulk Ops      │  │ • Performance   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## 🔧 Developer Experience

### API Documentation
- **Interactive Docs**: Swagger/OpenAPI at `/docs`
- **Code Examples**: Multiple languages (curl, JS, Python, PHP)
- **Error Reference**: Complete error code catalog
- **Rate Limit Guide**: Usage patterns and best practices

### Common Troubleshooting
```
❓ "File not updating?"
   → Check if you're using the NEW blobId (content is immutable)
   → Verify cache invalidation for old blobId
   → Confirm file metadata updated in Tusky

❓ "Cache miss rate high?"
   → Review TTL settings for your use case
   → Consider pinning frequently accessed content
   → Check Walrus network health status

❓ "Upload failing?"
   → Verify API key and permissions
   → Check file size limits (100MB default)
   → Ensure vault exists and is accessible
```

## 🌐 Multi-Region & Edge Deployment

### Edge Cache Architecture
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Global Edge Network                                  │
│                                                                                 │
│    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│    │   US-West       │    │     EU-West     │    │   Asia-Pacific  │            │
│    │                 │    │                 │    │                 │            │
│    │ • Local Cache   │    │ • Local Cache   │    │ • Local Cache   │            │
│    │ • Redis Cluster │    │ • Redis Cluster │    │ • Redis Cluster │            │
│    │ • Health Check  │    │ • Health Check  │    │ • Health Check  │            │
│    │ • Auto Failover │    │ • Auto Failover │    │ • Auto Failover │            │
│    └─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘            │
│              │                      │                      │                    │
│              └──────────────────────┼──────────────────────┘                    │
│                                     ▼                                           │
│                           ┌─────────────────┐                                   │
│                           │   Origin Pool   │                                   │
│                           │                 │                                   │
│                           │ • Walrus Network│                                   │
│                           │ • Tusky Services│                                   │
│                           │ • Health Monitor│                                   │
│                           │ • Load Balance  │                                   │
│                           └─────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 📊 Advanced Monitoring & Alerting

### Self-Healing Capabilities
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Auto-Recovery System                               │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Health Monitors │  │  Alert Triggers │  │ Recovery Actions│                  │
│  │                 │  │                 │  │                 │                  │
│  │ • Endpoint Check│  │ • Threshold     │  │ • Service Restart│                 │
│  │ • Performance   │  │ • Anomaly Detect│  │ • Failover      │                  │
│  │ • Error Rates   │  │ • Pattern Match │  │ • Scale Up      │                  │
│  │ • Resource Use  │  │ • Trend Analysis│  │ • Cache Warm    │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│                                                                                 │
│  Alert Channels:                          Recovery Strategies:                  │
│  • Slack/Discord                         • Circuit Breaker                     │
│  • Email/SMS                             • Graceful Degradation                │
│  • PagerDuty                             • Auto-scaling                        │
│  • Webhook                               • Health Promotion                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

This comprehensive architecture chart covers all the major components, data flows, security layers, and monitoring aspects of the WCDN system. Each diagram shows how the different parts work together to provide a robust, secure, and high-performance CDN solution for Walrus decentralized storage.