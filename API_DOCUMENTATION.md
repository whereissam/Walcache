# WCDN API Documentation v1

## Overview

The WCDN (Walrus Content Delivery Network) API follows Stripe-style REST principles with consistent resource structures, standardized error handling, and cursor-based pagination.

**Base URL:** `https://api.wcdn.dev/v1`  
**Authentication:** Bearer token in `Authorization` header

## 📚 Interactive Documentation

### Swagger UI
Access the interactive API documentation and test endpoints directly:
- **Local Development:** `http://localhost:4500/docs`
- **Production:** `https://api.wcdn.dev/docs`

### OpenAPI Specification
Download the OpenAPI specification:
- **YAML Format:** `http://localhost:4500/openapi.yaml`
- **JSON Format:** `http://localhost:4500/openapi.json`

### Testing with Swagger
The Swagger UI allows you to:
- ✅ Test all API endpoints interactively
- ✅ See real request/response examples
- ✅ Generate client code in multiple languages
- ✅ Validate request schemas automatically
- ✅ Copy cURL commands for CLI testing

## Core Principles

### 1. RESTful Design
- Resources are nouns (`/blobs`, `/uploads`, `/cache`)
- Standard HTTP methods (GET, POST, PATCH, DELETE)
- Idempotent operations where appropriate

### 2. Consistent Resource Structure
All objects have:
- `id` - Unique identifier
- `object` - Resource type
- `created` - Unix timestamp

### 3. Standardized Errors
```json
{
  "error": {
    "type": "validation_error",
    "message": "Invalid blob ID format",
    "code": "VALIDATION_FAILED",
    "param": "id"
  }
}
```

### 4. Pagination
Cursor-based pagination using `starting_after` and `ending_before`:
```json
{
  "object": "list",
  "data": [...],
  "has_more": true,
  "url": "/v1/blobs"
}
```

## Authentication

Include your API key in the Authorization header:
```
Authorization: Bearer sk_live_abc123...
```

## Resources

### Blobs

Blob objects represent content stored in the Walrus network.

#### The Blob Object

```json
{
  "id": "GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c",
  "object": "blob",
  "created": 1720000000,
  "cid": "GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c",
  "size": 2048576,
  "content_type": "image/jpeg",
  "cached": true,
  "pinned": false,
  "cache_date": 1720001000,
  "ttl": 3600,
  "source": "cache"
}
```

#### Retrieve a Blob

```http
GET /v1/blobs/{id}
```

**Parameters:**
- `id` (required) - The blob ID

**Example:**
```bash
curl https://api.wcdn.dev/v1/blobs/GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c \\
  -H "Authorization: Bearer sk_live_abc123"
```

**🚀 Try it in Swagger:** [GET /v1/blobs/{id}](http://localhost:4500/docs#/Blobs/get_blobs__id_)

#### List Blobs

```http
GET /v1/blobs
```

**Parameters:**
- `limit` (optional) - Number of results (1-100, default: 10)
- `starting_after` (optional) - Cursor for pagination
- `ending_before` (optional) - Cursor for pagination
- `cached` (optional) - Filter by cached status
- `pinned` (optional) - Filter by pinned status

**Example:**
```bash
curl "https://api.wcdn.dev/v1/blobs?limit=20&cached=true" \\
  -H "Authorization: Bearer sk_live_abc123"
```

**🚀 Try it in Swagger:** [GET /v1/blobs](http://localhost:4500/docs#/Blobs/get_blobs)

#### Pin a Blob

```http
POST /v1/blobs/{id}/pin
```

Pins a blob to prevent cache eviction.

**Example:**
```bash
curl -X POST https://api.wcdn.dev/v1/blobs/GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c/pin \\
  -H "Authorization: Bearer sk_live_abc123"
```

#### Unpin a Blob

```http
DELETE /v1/blobs/{id}/pin
```

**Example:**
```bash
curl -X DELETE https://api.wcdn.dev/v1/blobs/GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c/pin \\
  -H "Authorization: Bearer sk_live_abc123"
```

#### Delete Blob from Cache

```http
DELETE /v1/blobs/{id}
```

**Example:**
```bash
curl -X DELETE https://api.wcdn.dev/v1/blobs/GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c \\
  -H "Authorization: Bearer sk_live_abc123"
```

---

### Uploads

Upload objects represent file upload operations to the Walrus network.

#### The Upload Object

```json
{
  "id": "upload_1720000000_abc123",
  "object": "upload",
  "created": 1720000000,
  "filename": "document.pdf",
  "size": 2048576,
  "content_type": "application/pdf",
  "blob_id": "GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c",
  "status": "completed",
  "vault_id": "vault_abc123",
  "parent_id": null
}
```

#### Create an Upload

```http
POST /v1/uploads
```

**Parameters:**
- `vault_id` (optional) - Tusky vault ID
- `parent_id` (optional) - Parent folder ID

**Body:** Multipart form data with file

**Example:**
```bash
curl -X POST https://api.wcdn.dev/v1/uploads \\
  -H "Authorization: Bearer sk_live_abc123" \\
  -F "file=@document.pdf" \\
  -F "vault_id=vault_abc123"
```

#### Retrieve an Upload

```http
GET /v1/uploads/{id}
```

**Example:**
```bash
curl https://api.wcdn.dev/v1/uploads/upload_1720000000_abc123 \\
  -H "Authorization: Bearer sk_live_abc123"
```

#### List Uploads

```http
GET /v1/uploads
```

**Parameters:**
- `limit` (optional) - Number of results (1-100, default: 10)
- `starting_after` (optional) - Cursor for pagination
- `ending_before` (optional) - Cursor for pagination
- `vault_id` (optional) - Filter by vault ID
- `status` (optional) - Filter by status (processing, completed, failed)

**Example:**
```bash
curl "https://api.wcdn.dev/v1/uploads?status=completed&limit=20" \\
  -H "Authorization: Bearer sk_live_abc123"
```

#### Delete an Upload

```http
DELETE /v1/uploads/{id}
```

**Example:**
```bash
curl -X DELETE https://api.wcdn.dev/v1/uploads/upload_1720000000_abc123 \\
  -H "Authorization: Bearer sk_live_abc123"
```

---

### Cache

Cache objects represent cached content in the CDN.

#### The Cache Object

```json
{
  "id": "cache_GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c",
  "object": "cache",
  "created": 1720000000,
  "blob_id": "GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c",
  "size": 2048576,
  "pinned": false,
  "ttl": 3600,
  "expires_at": 1720003600,
  "last_accessed": 1720002000
}
```

#### Retrieve a Cache Entry

```http
GET /v1/cache/{id}
```

**Example:**
```bash
curl https://api.wcdn.dev/v1/cache/GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c \\
  -H "Authorization: Bearer sk_live_abc123"
```

#### List Cache Entries

```http
GET /v1/cache
```

**Parameters:**
- `limit` (optional) - Number of results (1-100, default: 10)
- `starting_after` (optional) - Cursor for pagination
- `ending_before` (optional) - Cursor for pagination
- `pinned` (optional) - Filter by pinned status

**Example:**
```bash
curl "https://api.wcdn.dev/v1/cache?pinned=true" \\
  -H "Authorization: Bearer sk_live_abc123"
```

#### Get Cache Statistics

```http
GET /v1/cache/stats
```

**Example:**
```bash
curl https://api.wcdn.dev/v1/cache/stats \\
  -H "Authorization: Bearer sk_live_abc123"
```

**Response:**
```json
{
  "object": "cache_stats",
  "created": 1720000000,
  "total_entries": 1250,
  "total_size_bytes": 5368709120,
  "pinned_entries": 45,
  "memory_usage_mb": 512,
  "redis_connected": true,
  "hit_rate": 89.5
}
```

#### Preload Blobs

```http
POST /v1/cache/preload
```

**Body:**
```json
{
  "blob_ids": [
    "GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c",
    "AnotherBlobId123456789..."
  ]
}
```

**Example:**
```bash
curl -X POST https://api.wcdn.dev/v1/cache/preload \\
  -H "Authorization: Bearer sk_live_abc123" \\
  -H "Content-Type: application/json" \\
  -d '{"blob_ids": ["GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c"]}'
```

#### Clear Cache

```http
POST /v1/cache/clear
```

**Body (optional):**
```json
{
  "blob_ids": [
    "GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c"
  ]
}
```

Clear entire cache (if no blob_ids provided):
```bash
curl -X POST https://api.wcdn.dev/v1/cache/clear \\
  -H "Authorization: Bearer sk_live_abc123"
```

Clear specific blobs:
```bash
curl -X POST https://api.wcdn.dev/v1/cache/clear \\
  -H "Authorization: Bearer sk_live_abc123" \\
  -H "Content-Type: application/json" \\
  -d '{"blob_ids": ["GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c"]}'
```

#### Delete Cache Entry

```http
DELETE /v1/cache/{id}
```

**Example:**
```bash
curl -X DELETE https://api.wcdn.dev/v1/cache/GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c \\
  -H "Authorization: Bearer sk_live_abc123"
```

---

### Analytics

Analytics objects provide insights into blob usage and performance.

#### The Analytics Object

```json
{
  "id": "analytics_GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c",
  "object": "analytics",
  "created": 1720000000,
  "blob_id": "GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c",
  "total_requests": 1543,
  "cache_hits": 1387,
  "cache_misses": 156,
  "total_bytes_served": 3167285248,
  "last_accessed": 1720002000,
  "geographic_stats": {
    "US": 892,
    "EU": 451,
    "APAC": 200
  }
}
```

#### Retrieve Analytics

```http
GET /v1/analytics/{blob_id}
```

**Example:**
```bash
curl https://api.wcdn.dev/v1/analytics/GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c \\
  -H "Authorization: Bearer sk_live_abc123"
```

#### List Analytics

```http
GET /v1/analytics
```

**Parameters:**
- `limit` (optional) - Number of results (1-100, default: 10)
- `starting_after` (optional) - Cursor for pagination
- `ending_before` (optional) - Cursor for pagination
- `blob_id` (optional) - Filter by specific blob
- `period` (optional) - Time period (1h, 24h, 7d, 30d)

**Example:**
```bash
curl "https://api.wcdn.dev/v1/analytics?period=24h&limit=20" \\
  -H "Authorization: Bearer sk_live_abc123"
```

#### Get Global Analytics

```http
GET /v1/analytics/global
```

**Example:**
```bash
curl https://api.wcdn.dev/v1/analytics/global \\
  -H "Authorization: Bearer sk_live_abc123"
```

**Response:**
```json
{
  "object": "global_analytics",
  "created": 1720000000,
  "global": {
    "total_requests": 50432,
    "cache_hits": 45389,
    "cache_misses": 5043,
    "total_bytes_served": 107374182400,
    "unique_cids": 2341,
    "uptime": 2592000
  },
  "cache": {
    "total_entries": 1250,
    "total_size": 5368709120,
    "pinned_entries": 45,
    "memory_usage": 536870912,
    "redis_connected": true
  },
  "geographic": {
    "US": 25216,
    "EU": 15129,
    "APAC": 10087
  },
  "top_blobs": [...],
  "system": {...},
  "application": {...}
}
```

#### Get Prometheus Metrics

```http
GET /v1/analytics/prometheus
```

**Example:**
```bash
curl https://api.wcdn.dev/v1/analytics/prometheus \\
  -H "Authorization: Bearer sk_live_abc123"
```

Returns metrics in Prometheus format for monitoring integration.

---

## Error Types

| Type | Description | HTTP Status |
|------|-------------|-------------|
| `validation_error` | Invalid request parameters | 400 |
| `authentication_error` | Missing or invalid API key | 401 |
| `permission_error` | Insufficient permissions | 403 |
| `not_found_error` | Resource not found | 404 |
| `rate_limit_error` | Too many requests | 429 |
| `api_error` | Internal server error | 500 |
| `network_error` | External service error | 502 |

## Rate Limiting

API requests are rate limited based on your plan:
- **Free:** 100 requests per minute
- **Pro:** 1,000 requests per minute  
- **Enterprise:** 10,000 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1720000060
```

## Webhooks

WCDN can send webhooks for events like successful uploads, cache evictions, and errors.

### Event Types
- `blob.uploaded` - New blob uploaded
- `blob.cached` - Blob cached
- `blob.evicted` - Blob evicted from cache
- `upload.completed` - Upload completed
- `upload.failed` - Upload failed

### Webhook Format
```json
{
  "id": "evt_1720000000_abc123",
  "type": "blob.uploaded",
  "created": 1720000000,
  "data": {
    "object": {
      "id": "GvonK6tzar1onhLJwdPz8Q8MQY6Nx17UZQw3UmL1i8c",
      "object": "blob",
      ...
    }
  }
}
```

## 🛠️ Development Tools

### Interactive API Testing
- **Swagger UI:** `http://localhost:4500/docs` - Test all endpoints with a web interface
- **OpenAPI Spec:** `http://localhost:4500/openapi.yaml` - Download specification for tools
- **Postman Collection:** Generate from OpenAPI spec for team collaboration

### Code Generation
Generate client SDKs from the OpenAPI specification:
```bash
# Install OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript SDK
openapi-generator-cli generate -i http://localhost:4500/openapi.yaml -g typescript-axios -o ./sdk-typescript

# Generate Python SDK  
openapi-generator-cli generate -i http://localhost:4500/openapi.yaml -g python -o ./sdk-python

# Generate Go SDK
openapi-generator-cli generate -i http://localhost:4500/openapi.yaml -g go -o ./sdk-go
```

### Testing with cURL
All examples in this documentation include cURL commands. You can also copy them directly from the Swagger UI interface.

## SDKs

Official SDKs are available for:
- [JavaScript/TypeScript](https://github.com/wcdn/sdk-js)
- [Python](https://github.com/wcdn/sdk-python)
- [Go](https://github.com/wcdn/sdk-go)
- [Rust](https://github.com/wcdn/sdk-rust)

Generate additional SDKs using the OpenAPI specification above.

---

## Support

- **Interactive Docs:** `http://localhost:4500/docs` (Swagger UI)
- **Documentation:** https://docs.wcdn.dev
- **API Status:** https://status.wcdn.dev
- **Support:** support@wcdn.dev
- **Community:** https://discord.gg/wcdn

## 🚀 Quick Start

1. **Start the server:**
   ```bash
   cd cdn-server
   bun install
   bun dev
   ```

2. **Access interactive documentation:**
   ```
   http://localhost:4500/docs
   ```

3. **Test your first API call:**
   - Open Swagger UI
   - Click on "GET /v1/blobs"
   - Click "Try it out"
   - Set your Authorization header: `Bearer your_api_key`
   - Execute the request

4. **Download OpenAPI spec for tools:**
   ```
   http://localhost:4500/openapi.yaml
   ```