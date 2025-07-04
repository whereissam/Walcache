# @wcdn/sdk

The official TypeScript/JavaScript SDK for WCDN (Walrus CDN Layer), providing easy integration with the Walrus CDN proxy and analytics.

## Installation

```bash
npm install @wcdn/sdk
# or
yarn add @wcdn/sdk
# or
bun add @wcdn/sdk
```

## Quick Start

```typescript
import { createWCDNClient, getCDNUrl } from '@wcdn/sdk';

// Create a client instance
const client = createWCDNClient({
  baseURL: 'http://localhost:3000/api',
  apiKey: 'your-api-key', // optional
  timeout: 10000 // optional, default 10s
});

// Get CDN URL for a CID
const url = getCDNUrl('bafybeihabcxyz123...');
console.log(url); // http://localhost:3000/cdn/bafybeihabcxyz123...

// Fetch content directly
const content = await client.fetchContent('bafybeihabcxyz123...');

// Get statistics
const stats = await client.getCIDStats('bafybeihabcxyz123...');
console.log(stats.cached, stats.pinned);

// Preload content
await client.preloadCIDs([
  'bafybeihabcxyz123...',
  'bafybeihabcxyz456...'
]);
```

## API Reference

### WCDNClient

The main client class for interacting with WCDN.

#### Constructor

```typescript
const client = createWCDNClient({
  baseURL: string,      // WCDN API base URL
  apiKey?: string,      // Optional API key for authentication
  timeout?: number      // Request timeout in milliseconds (default: 10000)
});
```

#### Methods

##### `getCDNUrl(cid: string): string`

Get the CDN URL for a given CID without making a request.

```typescript
const url = client.getCDNUrl('bafybeihabcxyz123...');
// Returns: http://localhost:3000/cdn/bafybeihabcxyz123...
```

##### `fetchContent(cid: string): Promise<ArrayBuffer>`

Fetch content directly from the CDN.

```typescript
const content = await client.fetchContent('bafybeihabcxyz123...');
const text = new TextDecoder().decode(content);
```

##### `getCIDStats(cid: string): Promise<CIDInfo>`

Get statistics and cache information for a specific CID.

```typescript
const info = await client.getCIDStats('bafybeihabcxyz123...');
console.log({
  cached: info.cached,
  pinned: info.pinned,
  requests: info.stats?.requests,
  hitRate: info.stats?.hitRate
});
```

##### `preloadCIDs(cids: string[]): Promise<PreloadResult>`

Preload multiple CIDs to cache.

```typescript
const result = await client.preloadCIDs([
  'bafybeihabcxyz123...',
  'bafybeihabcxyz456...'
]);

console.log(`Cached ${result.cached}/${result.total} CIDs`);
```

##### `pinCID(cid: string): Promise<{cid: string, status: string, cached: boolean}>`

Pin a CID to prevent it from being evicted from cache.

```typescript
await client.pinCID('bafybeihabcxyz123...');
```

##### `unpinCID(cid: string): Promise<{cid: string, status: string}>`

Unpin a CID, allowing it to be evicted from cache.

```typescript
await client.unpinCID('bafybeihabcxyz123...');
```

##### `getMetrics(): Promise<MetricsResponse>`

Get global CDN metrics and statistics.

```typescript
const metrics = await client.getMetrics();
console.log({
  totalRequests: metrics.global.totalRequests,
  hitRate: metrics.global.globalHitRate,
  topCIDs: metrics.topCIDs
});
```

##### `getCacheStats(): Promise<CacheStats>`

Get detailed cache statistics.

```typescript
const cacheStats = await client.getCacheStats();
console.log({
  backend: cacheStats.using,
  memoryKeys: cacheStats.memory.keys,
  redisKeys: cacheStats.redis.keys
});
```

##### `clearCache(): Promise<{status: string}>`

Clear all cache (requires appropriate permissions).

```typescript
await client.clearCache();
```

##### `healthCheck(): Promise<HealthResponse>`

Check CDN health status.

```typescript
const health = await client.healthCheck();
console.log(health.status); // 'ok'
```

### Utility Functions

#### `getCDNUrl(cid: string, baseURL?: string): string`

Convenience function to get CDN URL without creating a client.

```typescript
import { getCDNUrl } from '@wcdn/sdk';

const url = getCDNUrl('bafybeihabcxyz123...', 'https://cdn.example.com');
```

#### `validateCID(cid: string): boolean`

Validate CID format.

```typescript
import { validateCID } from '@wcdn/sdk';

if (validateCID('bafybeihabcxyz123...')) {
  // Valid CID
}
```

#### Formatting Utilities

```typescript
import { utils } from '@wcdn/sdk';

utils.formatBytes(1024);        // "1.0 KB"
utils.formatNumber(1500);       // "1.5K"
utils.formatPercentage(0.85);   // "85.0%"
utils.formatLatency(250);       // "250ms"
utils.truncateCID('bafybeihabcxyz123...', 6); // "bafybe...xyz123"
```

## Error Handling

The SDK throws standard JavaScript errors. Wrap API calls in try-catch blocks:

```typescript
try {
  const stats = await client.getCIDStats('invalid-cid');
} catch (error) {
  if (error.response?.status === 404) {
    console.log('CID not found');
  } else if (error.response?.status === 400) {
    console.log('Invalid CID format');
  } else {
    console.log('Network or server error');
  }
}
```

## React Integration

```typescript
import { createWCDNClient } from '@wcdn/sdk';
import { useState, useEffect } from 'react';

const client = createWCDNClient({
  baseURL: 'http://localhost:3000/api'
});

function CIDComponent({ cid }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.getCIDStats(cid)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [cid]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <p>Cached: {stats.cached ? 'Yes' : 'No'}</p>
      <p>Requests: {stats.stats?.requests || 0}</p>
      <img src={client.getCDNUrl(cid)} alt="Content" />
    </div>
  );
}
```

## TypeScript Support

The SDK is written in TypeScript and includes complete type definitions:

```typescript
import { WCDNClient, CIDStats, MetricsResponse } from '@wcdn/sdk';

const client: WCDNClient = createWCDNClient({
  baseURL: 'http://localhost:3000/api'
});

const stats: CIDStats = await client.getCIDStats('...');
const metrics: MetricsResponse = await client.getMetrics();
```

## Node.js vs Browser

The SDK works in both Node.js and browser environments. In Node.js, you might want to use it for server-side preloading:

```typescript
// server.js
import { createWCDNClient } from '@wcdn/sdk';

const client = createWCDNClient({
  baseURL: 'http://localhost:3000/api'
});

// Preload critical content on server start
await client.preloadCIDs([
  'bafybeihabcxyz123...', // landing page images
  'bafybeihabcxyz456...', // app assets
]);
```

## License

MIT