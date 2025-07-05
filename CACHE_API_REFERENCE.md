# Cache Invalidation API Reference

## 🎯 Overview

WCDN provides comprehensive cache management APIs for manual and automated cache invalidation. Since Walrus content is immutable (each blobId represents a unique content hash), cache invalidation removes old blobId entries rather than overwriting content.

## 🔑 Authentication

All cache management operations require API key authentication:

```bash
# Include X-API-Key header in all requests
curl -H "X-API-Key: your-api-key-here" \
     -X DELETE http://localhost:4500/api/cache/{blobId}
```

## 📋 API Endpoints

### 1. Single Cache Entry Deletion

Delete a specific cached blob by blobId.

```http
DELETE /api/cache/{blobId}
```

**Parameters:**
- `blobId` (path): Walrus blob ID to remove from cache

**Response:**
```json
{
  "cid": "sibZ297_DArzpYdVbxFegC3WYMLPwglE_ml0v3c8am0",
  "status": "deleted"
}
```

**Error Responses:**
```json
// Invalid blobId format
{
  "error": "Invalid CID format"
}

// Not found in cache (not an error - idempotent)
{
  "cid": "abc123...",
  "status": "not_cached"
}
```

**Example:**
```bash
curl -X DELETE \
  -H "X-API-Key: your-api-key" \
  "http://localhost:4500/api/cache/sibZ297_DArzpYdVbxFegC3WYMLPwglE_ml0v3c8am0"
```

### 2. Bulk Cache Invalidation

Remove multiple cached blobs in a single operation.

```http
POST /api/cache/invalidate
```

**Request Body:**
```json
{
  "cids": [
    "blobId1_here",
    "blobId2_here", 
    "blobId3_here"
  ]
}
```

**Validation:**
- `cids`: Array of 1-100 valid blob IDs
- Each blobId must pass format validation

**Response:**
```json
{
  "successful": [
    {
      "cid": "blobId1_here",
      "status": "invalidated"
    },
    {
      "cid": "blobId2_here", 
      "status": "invalidated"
    }
  ],
  "failed": [
    "Invalid CID format: invalid_id_here"
  ],
  "total": 3,
  "invalidated": 2
}
```

**Example:**
```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "cids": [
      "sibZ297_DArzpYdVbxFegC3WYMLPwglE_ml0v3c8am0",
      "another_blob_id_here"
    ]
  }' \
  "http://localhost:4500/api/cache/invalidate"
```

### 3. Complete Cache Clear

Remove all cached content (use with caution).

```http
POST /api/cache/clear
```

**Response:**
```json
{
  "status": "cleared"
}
```

**Example:**
```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  "http://localhost:4500/api/cache/clear"
```

### 4. Webhook Cache Invalidation

Automated cache invalidation triggered by external systems.

```http
POST /api/webhook/cache-invalidate
```

**Request Body:**
```json
{
  "type": "file_deleted",
  "blobId": "current_blob_id",
  "oldBlobId": "previous_blob_id_if_updated"
}
```

**Event Types:**
- `file_deleted`: Remove cache for deleted file
- `file_updated`: Remove cache for old version

**Response:**
```json
{
  "status": "processed"
}
```

**Example Use Cases:**
```bash
# File deletion event
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "type": "file_deleted",
    "blobId": "sibZ297_DArzpYdVbxFegC3WYMLPwglE_ml0v3c8am0"
  }' \
  "http://localhost:4500/api/webhook/cache-invalidate"

# File update event (invalidate old version)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "type": "file_updated", 
    "blobId": "new_blob_id_here",
    "oldBlobId": "old_blob_id_here"
  }' \
  "http://localhost:4500/api/webhook/cache-invalidate"
```

## 🔄 Cache Invalidation Strategies

### Automatic Invalidation

WCDN automatically invalidates cache in these scenarios:

1. **File Deletion**: When files are deleted via `/upload/files/{id}`
2. **File Updates**: When file content changes (new blobId created)
3. **Vault Deletion**: When entire vaults are removed

### Manual Invalidation

Use manual invalidation for:

1. **Content Moderation**: Remove inappropriate content
2. **Data Corrections**: Force refresh of corrected content
3. **Emergency Response**: Quickly remove problematic content
4. **Testing**: Clear cache during development/testing

### Webhook Integration

Integrate with external systems using webhooks:

```javascript
// Example: Integrate with CI/CD pipeline
const cacheInvalidation = {
  url: 'http://localhost:4500/api/webhook/cache-invalidate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'file_updated',
    blobId: newBlobId,
    oldBlobId: oldBlobId
  })
};

fetch(cacheInvalidation.url, cacheInvalidation)
  .then(response => response.json())
  .then(data => console.log('Cache invalidated:', data));
```

## 📊 Monitoring & Analytics

### Cache Invalidation Metrics

Track cache invalidation performance:

```http
GET /api/metrics
```

**Response includes:**
```json
{
  "cache": {
    "invalidations": {
      "total": 1250,
      "last_24h": 45,
      "manual": 12,
      "automatic": 33,
      "webhook": 8
    },
    "hit_rate_impact": {
      "before_invalidation": 0.85,
      "after_invalidation": 0.72,
      "recovery_time": "00:15:30"
    }
  }
}
```

### Audit Logging

All cache operations are logged with:

- **Timestamp**: When operation occurred
- **User/System**: Who or what triggered invalidation
- **BlobIds**: Which content was affected
- **Reason**: Manual, automatic, or webhook triggered
- **Success/Failure**: Operation outcome

## ⚠️ Best Practices

### Performance Considerations

1. **Batch Operations**: Use bulk invalidation for multiple items
2. **Off-Peak Timing**: Schedule large invalidations during low traffic
3. **Cache Warming**: Pre-populate cache after major invalidations
4. **Monitor Impact**: Track hit rate changes after invalidation

### Security Recommendations

1. **API Key Rotation**: Regularly rotate cache management API keys
2. **Least Privilege**: Use separate keys for different operations
3. **Audit Trail**: Monitor all cache invalidation activities
4. **Rate Limiting**: Respect API rate limits to avoid blocking

### Error Handling

```javascript
// Example: Robust cache invalidation with retry
async function invalidateCache(blobIds, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: {
          'X-API-Key': process.env.WCDN_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cids: blobIds })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Invalidated ${result.invalidated}/${result.total} items`);
        return result;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Cache invalidation failed after ${maxRetries} attempts`);
      }
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

## 🔗 Integration Examples

### Node.js/Express Integration

```javascript
const express = require('express');
const app = express();

// Middleware to invalidate cache on file changes
app.use('/api/files/:id', async (req, res, next) => {
  if (req.method === 'PUT' || req.method === 'DELETE') {
    // Get old blobId before operation
    req.oldBlobId = await getFileBlobId(req.params.id);
  }
  next();
});

app.delete('/api/files/:id', async (req, res) => {
  // Delete file
  await deleteFile(req.params.id);
  
  // Invalidate cache
  if (req.oldBlobId) {
    await invalidateCache([req.oldBlobId]);
  }
  
  res.json({ success: true });
});
```

### Python/Django Integration

```python
import requests
from django.conf import settings

class CacheInvalidationMixin:
    def invalidate_cache(self, blob_ids):
        """Invalidate WCDN cache for given blob IDs"""
        if not blob_ids:
            return
            
        response = requests.post(
            f"{settings.WCDN_BASE_URL}/api/cache/invalidate",
            headers={
                'X-API-Key': settings.WCDN_API_KEY,
                'Content-Type': 'application/json'
            },
            json={'cids': blob_ids}
        )
        
        response.raise_for_status()
        return response.json()

# Usage in views
class FileViewSet(CacheInvalidationMixin, viewsets.ModelViewSet):
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        blob_id = instance.blob_id
        
        # Delete file
        super().destroy(request, *args, **kwargs)
        
        # Invalidate cache
        self.invalidate_cache([blob_id])
        
        return Response(status=204)
```

## 📈 Performance Impact

### Expected Behavior

| Operation | Cache Hit Rate Impact | Recovery Time |
|-----------|----------------------|---------------|
| Single invalidation | < 1% decrease | < 30 seconds |
| Bulk invalidation (10-50 items) | 2-5% decrease | 1-2 minutes |
| Complete cache clear | 100% miss rate | 5-15 minutes |

### Optimization Tips

1. **Selective Invalidation**: Only invalidate changed content
2. **Cache Preloading**: Immediately cache new versions
3. **Gradual Rollout**: Invalidate in batches during updates
4. **Monitor Recovery**: Track hit rate restoration

This API reference provides comprehensive guidance for implementing efficient cache invalidation strategies in WCDN deployments.