# WCDN Multi-Chain Testnet Tests

This directory contains comprehensive tests for the WCDN SDK's multi-chain verification capabilities, with special focus on **Sui testnet** and **Ethereum Sepolia** testnet support.

## 🎯 What's Tested

### Sui Testnet Verification

- ✅ Sui object ownership verification
- ✅ Sui asset querying and metadata retrieval
- ✅ Sui testnet node selection and optimization
- ✅ Sui CDN URL generation

### Ethereum Sepolia Verification

- ✅ ERC-721 token ownership verification on Sepolia
- ✅ Smart contract querying with proper Sepolia RPC calls
- ✅ Sepolia testnet node selection and latency measurement
- ✅ Ethereum CDN URL generation for testnet

### Cross-Chain Features

- ✅ Multi-chain verification across Sui and Ethereum
- ✅ Advanced CDN URL generation with verification
- ✅ Node optimization and health checks
- ✅ Error handling and edge cases
- ✅ Integration testing workflows

## 🚀 Quick Start

### Run All Tests

```bash
# Run all multi-chain testnet tests
npm run test:testnet

# Run with watch mode
npm run test:testnet:watch

# Run with UI (browser-based test runner)
npm run test:ui
```

### Run Specific Test Suites

```bash
# Run only Ethereum Sepolia tests
npm run test:sepolia

# Run only Sui testnet tests
npm run test:sui-testnet

# Run the comprehensive test runner with examples
npm run test:runner
```

### Run Examples

```bash
# Run multi-chain verification examples
npm run demo:multichain
```

## 📁 Test Files

### `multi-chain-testnet.test.ts`

The main test suite covering:

- **Sui Testnet Verification**: Object ownership, asset queries, node selection
- **Ethereum Sepolia Verification**: ERC-721 token verification, contract queries
- **Cross-Chain Integration**: Multi-chain workflows and optimization
- **Error Handling**: Network timeouts, invalid inputs, edge cases

### Test Configuration Files

- `vitest.config.ts`: Vitest configuration with 30-second timeouts for network operations
- `scripts/run-testnet-tests.ts`: Comprehensive test runner with reporting

## 🔧 Test Configuration

### Network Configurations

The tests use the following testnet configurations:

#### Sui Testnet

```typescript
{
  rpcUrl: 'https://fullnode.testnet.sui.io:443',
  userAddress: '0x1234567890abcdef1234567890abcdef12345678',
  objectId: '0xabcdef123456789012345678901234567890abcdef123456789012345678901234',
}
```

#### Ethereum Sepolia

```typescript
{
  rpcUrl: 'https://sepolia.infura.io/v3/demo',
  userAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
  contractAddress: '0x1234567890123456789012345678901234567890',
  tokenId: '123',
  network: 'sepolia',
}
```

### Mock vs Real Testing

- **Development**: Tests use mock implementations for fast iteration
- **Integration**: Can be configured with real RPC endpoints for live testing
- **CI/CD**: Configurable for automated testing pipelines

## 🧪 Test Categories

### Unit Tests

- Individual verifier functionality
- Node selection algorithms
- URL generation logic
- Error handling

### Integration Tests

- End-to-end multi-chain workflows
- Real network interactions (when configured)
- Cross-chain verification scenarios

### Performance Tests

- Node latency measurement
- Health check performance
- Concurrent verification handling

## 📊 Test Results and Coverage

### Running with Coverage

```bash
# Generate test coverage report
npm run test:testnet -- --coverage

# View HTML coverage report
open coverage/index.html
```

### Expected Test Results

All tests should pass with the following success criteria:

- ✅ Sui testnet verification works correctly
- ✅ Ethereum Sepolia verification supports ERC-721 tokens
- ✅ Cross-chain verification handles multiple networks
- ✅ Node optimization selects fastest endpoints
- ✅ Error cases are handled gracefully

## 🔒 Security and Best Practices

### Network Safety

- Tests use demo RPC endpoints by default
- No private keys or sensitive data in test files
- Configurable timeouts prevent hanging tests
- Graceful error handling for network failures

### Test Data

- All test addresses and contract addresses are examples
- Mock implementations prevent accidental mainnet interactions
- Testnet-only configurations ensure safe testing

## 🚀 Production Readiness

These tests validate that the WCDN SDK is ready for:

- ✅ Multi-chain dApp development
- ✅ Testnet integration and testing
- ✅ Production deployment with proper RPC configuration
- ✅ Error handling and edge case management

## 📝 Adding New Tests

To add tests for new chains or features:

1. **Extend Configuration**:

```typescript
const NEW_CHAIN_CONFIG = {
  rpcUrl: 'https://new-chain-testnet.com',
  userAddress: 'new-chain-address',
  // ... other config
}
```

2. **Add Test Suite**:

```typescript
describe('New Chain Verification', () => {
  it('should verify asset ownership', async () => {
    // Test implementation
  })
})
```

3. **Update Test Scripts**:

```json
{
  "test:new-chain": "vitest run tests/multi-chain-testnet.test.ts -t \"New Chain\""
}
```

## 🤝 Contributing

When contributing tests:

1. Follow existing test patterns
2. Include both success and failure scenarios
3. Add proper documentation and comments
4. Ensure tests are deterministic and reliable
5. Test with both mock and real network data when possible

## 🎉 Ready for Multi-Chain Development!

With these comprehensive tests, the WCDN SDK is fully validated for:

- **Sui testnet** integration and development
- **Ethereum Sepolia** testnet support
- **Cross-chain** verification workflows
- **Production-ready** multi-chain applications

Happy testing! 🚀
