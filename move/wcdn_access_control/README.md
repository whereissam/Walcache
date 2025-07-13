# WCDN Access Control Move Package

This Move package provides access control patterns for Seal-encrypted content in the WCDN system.

## Overview

The package implements four main access control patterns:

1. **Owner Only**: Only the content owner can decrypt
2. **Allowlist**: Only users in an allowlist can decrypt
3. **Time-based**: Anyone can decrypt before expiration
4. **Public**: Anyone can decrypt anytime

## Access Control Types

### 1. Owner Only Access

```move
// Create owner-only access control
create_owner_only_access(content_id, ctx)

// Seal approve function
seal_approve_owner_only(id, access, ctx)
```

**Use case**: Private files that only the uploader should access.

### 2. Allowlist Access

```move
// Create allowlist access control
create_allowlist_access(content_id, ctx)

// Add users to allowlist
add_to_allowlist(access, user_address, ctx)

// Seal approve function
seal_approve_allowlist(id, access, ctx)
```

**Use case**: Shared files for specific team members or subscribers.

### 3. Time-based Access

```move
// Create time-based access control
create_time_based_access(content_id, expires_at, ctx)

// Seal approve function
seal_approve_time_based(id, access, clock, ctx)
```

**Use case**: Temporary public files, limited-time promotions.

### 4. Public Access

```move
// Create public access control
create_public_access(content_id, ctx)

// Seal approve function
seal_approve_public(id, access, ctx)
```

**Use case**: Public files that should be encrypted at rest but accessible to all.

## Deployment

1. **Install Sui CLI**: Follow [Sui installation guide](https://docs.sui.io/build/install)

2. **Build the package**:
```bash
cd move/wcdn_access_control
sui move build
```

3. **Deploy to testnet**:
```bash
sui client publish --gas-budget 50000000
```

4. **Deploy to mainnet**:
```bash
sui client publish --gas-budget 50000000
```

## Usage with WCDN + Seal

### Backend Integration

```javascript
// When uploading encrypted content
const result = await sealService.encryptData(fileBuffer, {
  packageId: "0x...", // Your deployed package ID
  id: contentId,
  threshold: 2,
})

// Upload to Walrus
await tuskyService.uploadFile({
  buffer: Buffer.from(result.encryptedObject),
  filename: `encrypted_${filename}`,
})
```

### Access Control Setup

```javascript
// Create allowlist access for team sharing
const tx = new Transaction()
tx.moveCall({
  target: `${packageId}::wcdn_access::create_allowlist_access`,
  arguments: [
    tx.pure.vector("u8", contentIdBytes),
  ]
})

// Add team members
tx.moveCall({
  target: `${packageId}::wcdn_access::add_to_allowlist`,
  arguments: [
    tx.object(accessObjectId),
    tx.pure.address(teamMemberAddress),
  ]
})
```

### Frontend Decryption

```javascript
// Create session key for package
const sessionKey = await SessionKey.create({
  address: userAddress,
  packageId: packageId,
  ttlMin: 10,
  suiClient,
})

// Sign session key
const message = sessionKey.getPersonalMessage()
const { signature } = await wallet.signPersonalMessage(message)
sessionKey.setPersonalMessageSignature(signature)

// Create transaction for seal approval
const tx = new Transaction()
tx.moveCall({
  target: `${packageId}::wcdn_access::seal_approve_allowlist`,
  arguments: [
    tx.pure.vector("u8", contentIdBytes),
    tx.object(accessObjectId),
  ]
})

const txBytes = tx.build({ client: suiClient, onlyTransactionKind: true })

// Decrypt content
const decryptedData = await sealClient.decrypt({
  data: encryptedBytes,
  sessionKey,
  txBytes,
})
```

## Security Considerations

1. **Package Immutability**: Once deployed, the package logic cannot be changed
2. **Object Ownership**: Access control objects are shared, allowing read access but controlled modification
3. **Time Validation**: Use Sui's Clock object for reliable time-based access control
4. **Gas Costs**: Each access check requires a transaction, consider gas optimization for high-frequency access

## Error Codes

- `ENotOwner (1)`: Caller is not the owner
- `ENotInAllowlist (2)`: User not in allowlist
- `ETimeExpired (3)`: Time-based access has expired
- `EInsufficientPayment (4)`: Reserved for future payment features
- `EAlreadyInAllowlist (5)`: User already in allowlist
- `ENotFound (6)`: Object or user not found

## Examples

See the `/examples` directory for complete integration examples:

- **Team File Sharing**: Allowlist-based access for team collaboration
- **Time-limited Content**: Temporary access for promotions
- **Public Archives**: Encrypted but publicly accessible content
- **Private Backups**: Owner-only access for personal files