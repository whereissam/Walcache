# Local Walrus Publisher Setup

This guide shows how to set up and test a local Walrus publisher for development.

## Prerequisites

- Walrus binary installed
- Sui Testnet wallet with sufficient SUI/WAL tokens
- Basic understanding of Walrus network

## 1. Start Local Publisher

Create publisher wallet directory and start the service:

```bash
# Create wallet directory
PUBLISHER_WALLETS_DIR=~/.config/walrus/publisher-wallets
mkdir -p "$PUBLISHER_WALLETS_DIR"

# Start publisher service
walrus publisher \
  --bind-address "127.0.0.1:31416" \
  --sub-wallets-dir "$PUBLISHER_WALLETS_DIR" \
  --n-clients 1
```

Alternative: Use daemon to start both aggregator + publisher:

```bash
walrus daemon \
  --bind-address "127.0.0.1:31416" \
  --aggregator-address "127.0.0.1:31417" \
  --sub-wallets-dir "$PUBLISHER_WALLETS_DIR" \
  --n-clients 1
```

## 2. Test Publisher HTTP Interface

The publisher exposes HTTP endpoints on the specified port (31416 in this example).

### Upload a blob:

```bash
# Upload a text file
curl -X PUT "http://127.0.0.1:31416/v1/blobs?epochs=1" \
  --data-binary @yourfile.txt

# Upload with more epochs for longer storage
curl -X PUT "http://127.0.0.1:31416/v1/blobs?epochs=5" \
  --data-binary @yourfile.txt

# Upload binary data
curl -X PUT "http://127.0.0.1:31416/v1/blobs?epochs=1" \
  --data-binary @image.png \
  -H "Content-Type: image/png"
```

### Expected successful response:

```json
{
  "newlyCreated": {
    "blobObject": {
      "id": "...",
      "blobId": "abc123...",
      "size": 1024,
      "encodingType": "RedStuff",
      "certifiedEpoch": 12345
    },
    "resourceOperation": {
      "RegisterBlobObject": {
        "blobId": "abc123...",
        "object": "...",
        "resourceType": "..."
      }
    }
  }
}
```

### Expected error responses:

**Insufficient balance:**

```json
{
  "error": "Insufficient WAL balance for storage epochs"
}
```

**Invalid parameters:**

```json
{
  "error": "Invalid epochs parameter: must be positive integer"
}
```

## 3. Monitor Publisher Logs

When you start the publisher, watch the terminal for:

### Successful startup:

```
[INFO] Publisher started on 127.0.0.1:31416
[INFO] Wallet loaded: 0x...
[INFO] WAL balance: 1000.0
```

### Request processing:

```
[INFO] PUT /v1/blobs - 201 - blob_id: abc123...
[INFO] Storage cost: 0.1 WAL for 1 epochs
```

### Error logs:

```
[ERROR] Insufficient balance for storage request
[WARN] Network connectivity issues
```

## 4. Check Metrics Endpoint

The publisher provides Prometheus metrics on port 27182:

```bash
# Check if metrics are available
curl http://127.0.0.1:27182/metrics

# Look for specific metrics
curl http://127.0.0.1:27182/metrics | grep walrus_
```

### Key metrics to monitor:

- `walrus_blobs_stored_total` - Total blobs stored
- `walrus_storage_cost_total` - Total WAL spent on storage
- `walrus_failed_requests_total` - Failed upload requests
- `walrus_wallet_balance` - Current wallet balance

## 5. Integration with WCDN

Update your WCDN configuration to use the local publisher:

### Environment variables (.env):

```bash
# Use local publisher
WALRUS_ENDPOINT=http://127.0.0.1:31416
WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
WALRUS_NETWORK=testnet

# Enable local development mode
NODE_ENV=development
```

### Test integration:

```bash
# Upload via WCDN upload endpoint
curl -X POST "http://localhost:4500/upload/file" \
  -F "file=@test.txt" \
  -F "epochs=1"

# Verify blob was stored
curl "http://localhost:4500/cdn/{blob_id}"
```

## 6. Common Issues and Solutions

### Port already in use:

```bash
# Find process using port 31416
lsof -i :31416

# Kill process if needed
kill -9 <PID>
```

### Wallet connection issues:

- Ensure wallet file exists in sub-wallets directory
- Check wallet has sufficient SUI for gas fees
- Verify wallet has WAL tokens for storage

### Network connectivity:

- Check internet connection for Sui network access
- Verify firewall allows outbound connections
- Test with curl to public Walrus endpoints

### Storage failures:

- Verify wallet balance: `sui client balance`
- Check WAL token balance
- Ensure epochs parameter is reasonable (1-200)

## 7. Production Considerations

For production deployment:

1. **Security**: Use dedicated wallets with limited funds
2. **Monitoring**: Set up alerts for metrics endpoints
3. **Backup**: Regularly backup wallet configurations
4. **Load balancing**: Use multiple publisher instances
5. **Storage management**: Monitor WAL token consumption

## 8. Useful Commands

```bash
# Check Sui wallet status
sui client active-address
sui client balance

# View recent transactions
sui client history

# Switch networks
sui client switch --env testnet
sui client switch --env mainnet

# Create new wallet
sui client new-address ed25519
```

This setup allows you to develop and test Walrus integration locally before deploying to production with public publishers.
