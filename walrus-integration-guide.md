# Walrus 整合指南

## 📋 已修正的 Walrus API 端點

### 1. Aggregator 讀取 Blob

**✅ 正確格式：**

```
GET {aggregatorEndpoint}/v1/blobs/{blobId}
```

**❌ 修正前：**

```
GET {aggregatorEndpoint}/v1/{cid}
```

### 2. Publisher 上傳 Blob

**✅ 正確格式：**

```
PUT {publisherEndpoint}/v1/blobs
PUT {publisherEndpoint}/v1/blobs?epochs=3
```

**❌ 修正前：**

```
POST {publisherEndpoint}/v1/store
```

## 🔄 Aggregator 同步處理

### 404 錯誤處理

當 Aggregator 還沒同步 blob 時會回傳 404，現在系統會：

1. **顯示友善錯誤訊息**
   - "Aggregator 尚未同步，請稍後再試"
   - 提供同步時間估計（1-2分鐘）

2. **自動重試機制**

   ```typescript
   async waitForAggregatorSync(blobId: string, maxRetries: number = 10, delayMs: number = 2000)
   ```

3. **Fallback 到 IPFS**
   - 如果 Walrus 不可用，自動嘗試 IPFS gateway

## 🧪 測試你的 Blob

使用你的 blob ID: `qbnfgi_e3qsbmxtmhb2mbkmvjc5pnf8efvydnf4b3ra`

### 1. 直接測試 Aggregator

```bash
# 正確的 Walrus Aggregator 端點
curl "https://aggregator.walrus.wal.app/v1/blobs/qbnfgi_e3qsbmxtmhb2mbkmvjc5pnf8efvydnf4b3ra"
```

### 2. 通過 WCDN 測試

```bash
# 啟動服務
cd cdn-server && bun dev

# 測試 CDN
curl "http://localhost:4500/cdn/qbnfgi_e3qsbmxtmhb2mbkmvjc5pnf8efvydnf4b3ra"
```

### 3. 檢查同步狀態

```bash
# 獲取詳細錯誤信息
curl -v "http://localhost:4500/api/stats/qbnfgi_e3qsbmxtmhb2mbkmvjc5pnf8efvydnf4b3ra"
```

## 🛠 Debug 同步問題

### 常見情況

1. **404 - 尚未同步**

   ```json
   {
     "error": "Blob not found on Walrus network",
     "message": "This blob may not exist or the aggregators have not synced it yet.",
     "suggestions": [
       "Verify the blob ID is correct",
       "Wait for aggregator synchronization (usually 1-2 minutes)",
       "Check if the blob was recently uploaded"
     ]
   }
   ```

2. **成功但來源是 IPFS**

   ```
   X-Source: ipfs
   ```

3. **成功且來源是 Walrus**
   ```
   X-Source: walrus
   ```

## 🚀 上傳後自動等待同步

```typescript
// 上傳並等待同步
const { blobId, synced } = await walrusService.uploadAndWaitForSync(
  buffer,
  'image/jpeg',
  3, // epochs
)

if (synced) {
  console.log(`Blob ${blobId} is ready on aggregator!`)
} else {
  console.log(`Blob ${blobId} uploaded but not yet synced`)
}
```

## 📊 監控同步狀態

### 前端顯示

- ✅ 同步狀態指示器
- ⏳ 等待同步的友善提示
- 🔄 自動重試按鈕

### 後端日誌

```
Waiting for aggregator to sync blob qbnfgi_e3qsbmxtmhb2mbkmvjc5pnf8efvydnf4b3ra...
Attempt 1/10: Blob qbnfgi_e3qsbmxtmhb2mbkmvjc5pnf8efvydnf4b3ra not yet synced
Blob qbnfgi_e3qsbmxtmhb2mbkmvjc5pnf8efvydnf4b3ra synced to aggregator after 3 attempts
```

## 🎯 最佳實踐

1. **上傳後輪詢**：上傳成功後自動檢查 aggregator 同步狀態
2. **用戶體驗**：顯示"正在同步"而不是錯誤訊息
3. **Fallback 策略**：Walrus → IPFS → 錯誤訊息
4. **緩存策略**：同步後立即快取，避免重複檢查

現在你的 blob `qbnfgi_e3qsbmxtmhb2mbkmvjc5pnf8efvydnf4b3ra` 應該可以正確存取了！
