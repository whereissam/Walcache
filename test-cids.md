# Getting Test CIDs for WCDN

## Method 1: Upload via Dashboard

1. Start the WCDN services:
```bash
# Terminal 1: Backend
cd cdn-server && bun dev

# Terminal 2: Frontend  
npm run dev
```

2. Open http://localhost:5173
3. Go to "Upload" tab
4. Upload a test file (image, text, etc.)
5. Copy the returned CID

## Method 2: Use Tusky.io Directly

```bash
# Upload file via Tusky API
curl -X POST "https://api.tusky.io/v1/files" \
  -H "Authorization: Bearer YOUR_TUSKY_API_KEY" \
  -F "file=@test-file.jpg" \
  -F "vaultId=YOUR_VAULT_ID"
```

## Method 3: Use Walrus CLI (if available)

```bash
# Install Walrus CLI
# Upload file
walrus store test-file.jpg
```

## Method 4: Use Public Test CIDs

Try these public Walrus test CIDs (if they exist):
- Check Walrus documentation for public test content
- Use sample files from Walrus examples

## Testing with Your CIDs

Once you have a CID, test these URLs:

1. **Direct CDN access:**
   ```
   http://localhost:4500/cdn/YOUR_CID
   ```

2. **CID information:**
   ```
   http://localhost:4500/api/stats/YOUR_CID
   ```

3. **Dashboard testing:**
   - Go to http://localhost:5173/explorer
   - Enter your CID
   - View statistics and metadata

## Example Test Workflow

```bash
# 1. Upload a test file
echo "Hello Walrus CDN!" > test.txt

# 2. Upload via dashboard or API
# 3. Get CID from response
CID="your_returned_cid"

# 4. Test CDN access
curl "http://localhost:4500/cdn/$CID"

# 5. Check cache stats
curl "http://localhost:4500/api/stats/$CID"

# 6. Test dashboard
# Open http://localhost:5173/explorer
# Enter the CID and explore
```