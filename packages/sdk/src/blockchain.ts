/**
 * Blockchain Integration Module
 * Provides smart contract interaction helpers for WCDN
 */

import { ethers } from 'ethers';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { z } from 'zod';
import type {
  SupportedChain,
  AssetVerificationOptions,
  AssetVerificationResult,
  AssetQueryOptions,
  AssetQueryResult,
  ChainVerifier,
  BlobMetadata,
} from './types';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const contractConfigSchema = z.object({
  ethereum: z.object({
    rpcUrl: z.string().url(),
    contractAddress: z.string(),
    abi: z.array(z.any()),
  }).optional(),
  sui: z.object({
    rpcUrl: z.string().url(),
    packageId: z.string(),
  }).optional(),
  solana: z.object({
    rpcUrl: z.string().url(),
    programId: z.string(),
  }).optional(),
});

type ContractConfig = z.infer<typeof contractConfigSchema>;

// =============================================================================
// SMART CONTRACT INTEGRATION
// =============================================================================

/**
 * Configuration for smart contract interactions
 */
export interface BlockchainConfig {
  ethereum?: {
    rpcUrl: string;
    contractAddress: string;
    abi: any[];
    privateKey?: string; // For writing operations
  };
  sui?: {
    rpcUrl: string;
    packageId: string;
    privateKey?: string; // For writing operations
  };
  solana?: {
    rpcUrl: string;
    programId: string;
    privateKey?: string; // For writing operations
  };
}

/**
 * Blob metadata as stored on blockchain
 */
export interface OnChainBlobMetadata {
  blobId: string;
  uploader: string;
  size: number;
  contentType: string;
  timestamp: number;
  cdnUrl: string;
  isPinned: boolean;
  contentHash: string;
}

/**
 * Batch registration parameters
 */
export interface BatchRegistrationParams {
  blobIds: string[];
  sizes: number[];
  contentTypes: string[];
  cdnUrls: string[];
  contentHashes: string[];
}

/**
 * Main blockchain integration class
 */
export class BlockchainIntegrator {
  private config: BlockchainConfig;
  private ethereumProvider?: ethers.JsonRpcProvider;
  private ethereumContract?: ethers.Contract;
  private suiClient?: SuiClient;

  constructor(config: BlockchainConfig) {
    this.config = contractConfigSchema.parse(config);
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize Ethereum
    if (this.config.ethereum) {
      this.ethereumProvider = new ethers.JsonRpcProvider(this.config.ethereum.rpcUrl);
      this.ethereumContract = new ethers.Contract(
        this.config.ethereum.contractAddress,
        this.config.ethereum.abi,
        this.ethereumProvider
      );
    }

    // Initialize Sui
    if (this.config.sui) {
      this.suiClient = new SuiClient({ url: this.config.sui.rpcUrl });
    }
  }

  // =============================================================================
  // ETHEREUM SMART CONTRACT INTERACTIONS
  // =============================================================================

  /**
   * Register a blob on Ethereum
   */
  async registerBlobOnEthereum(
    blobId: string,
    size: number,
    contentType: string,
    cdnUrl: string,
    contentHash: string,
    signerPrivateKey?: string
  ): Promise<string> {
    if (!this.ethereumContract || !this.ethereumProvider) {
      throw new Error('Ethereum not configured');
    }

    const privateKey = signerPrivateKey || this.config.ethereum?.privateKey;
    if (!privateKey) {
      throw new Error('Private key required for blockchain transactions');
    }

    const wallet = new ethers.Wallet(privateKey, this.ethereumProvider);
    const contract = this.ethereumContract.connect(wallet);

    const tx = await contract.registerBlob(
      blobId,
      size,
      contentType,
      cdnUrl,
      ethers.keccak256(ethers.toUtf8Bytes(contentHash))
    );

    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Register multiple blobs on Ethereum in batch
   */
  async registerBlobBatchOnEthereum(
    params: BatchRegistrationParams,
    signerPrivateKey?: string
  ): Promise<string> {
    if (!this.ethereumContract || !this.ethereumProvider) {
      throw new Error('Ethereum not configured');
    }

    const privateKey = signerPrivateKey || this.config.ethereum?.privateKey;
    if (!privateKey) {
      throw new Error('Private key required for blockchain transactions');
    }

    const wallet = new ethers.Wallet(privateKey, this.ethereumProvider);
    const contract = this.ethereumContract.connect(wallet);

    // Convert content hashes to bytes32
    const contentHashes = params.contentHashes.map(hash => 
      ethers.keccak256(ethers.toUtf8Bytes(hash))
    );

    const tx = await contract.registerBlobBatch(
      params.blobIds,
      params.sizes,
      params.contentTypes,
      params.cdnUrls,
      contentHashes
    );

    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Pin a blob on Ethereum
   */
  async pinBlobOnEthereum(blobId: string, signerPrivateKey?: string): Promise<string> {
    if (!this.ethereumContract || !this.ethereumProvider) {
      throw new Error('Ethereum not configured');
    }

    const privateKey = signerPrivateKey || this.config.ethereum?.privateKey;
    if (!privateKey) {
      throw new Error('Private key required for blockchain transactions');
    }

    const wallet = new ethers.Wallet(privateKey, this.ethereumProvider);
    const contract = this.ethereumContract.connect(wallet);

    const tx = await contract.pinBlob(blobId);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Get blob metadata from Ethereum
   */
  async getBlobMetadataFromEthereum(blobId: string): Promise<OnChainBlobMetadata | null> {
    if (!this.ethereumContract) {
      throw new Error('Ethereum not configured');
    }

    try {
      const metadata = await this.ethereumContract.getBlobMetadata(blobId);
      return {
        blobId: metadata.blobId,
        uploader: metadata.uploader,
        size: Number(metadata.size),
        contentType: metadata.contentType,
        timestamp: Number(metadata.timestamp),
        cdnUrl: metadata.cdnUrl,
        isPinned: metadata.isPinned,
        contentHash: metadata.contentHash,
      };
    } catch (error) {
      if (error.message?.includes('Blob does not exist')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Verify blob hash on Ethereum
   */
  async verifyBlobHashOnEthereum(blobId: string, contentHash: string): Promise<boolean> {
    if (!this.ethereumContract) {
      throw new Error('Ethereum not configured');
    }

    const hashBytes = ethers.keccak256(ethers.toUtf8Bytes(contentHash));
    return await this.ethereumContract.verifyBlobHash(blobId, hashBytes);
  }

  /**
   * Get all blobs for an uploader on Ethereum
   */
  async getUploaderBlobsFromEthereum(uploaderAddress: string): Promise<string[]> {
    if (!this.ethereumContract) {
      throw new Error('Ethereum not configured');
    }

    return await this.ethereumContract.getUploaderBlobs(uploaderAddress);
  }

  // =============================================================================
  // SUI MOVE CONTRACT INTERACTIONS
  // =============================================================================

  /**
   * Register a blob on Sui
   */
  async registerBlobOnSui(
    blobId: string,
    size: number,
    contentType: string,
    cdnUrl: string,
    contentHash: string,
    signerPrivateKey?: string
  ): Promise<string> {
    if (!this.suiClient || !this.config.sui) {
      throw new Error('Sui not configured');
    }

    // This would require Sui transaction building and signing
    // For now, return a placeholder
    throw new Error('Sui blob registration not yet implemented - requires Sui SDK integration');
  }

  /**
   * Get blob metadata from Sui
   */
  async getBlobMetadataFromSui(blobId: string): Promise<OnChainBlobMetadata | null> {
    if (!this.suiClient || !this.config.sui) {
      throw new Error('Sui not configured');
    }

    // This would require querying the Sui Move module
    // For now, return null
    return null;
  }

  // =============================================================================
  // CROSS-CHAIN HELPERS
  // =============================================================================

  /**
   * Register blob on all configured chains
   */
  async registerBlobMultiChain(
    blobId: string,
    size: number,
    contentType: string,
    cdnUrl: string,
    contentHash: string
  ): Promise<Record<SupportedChain, string | null>> {
    const results: Record<SupportedChain, string | null> = {
      ethereum: null,
      sui: null,
      solana: null,
    };

    // Register on Ethereum if configured
    if (this.config.ethereum) {
      try {
        results.ethereum = await this.registerBlobOnEthereum(
          blobId,
          size,
          contentType,
          cdnUrl,
          contentHash
        );
      } catch (error) {
        console.error('Ethereum registration failed:', error);
      }
    }

    // Register on Sui if configured
    if (this.config.sui) {
      try {
        results.sui = await this.registerBlobOnSui(
          blobId,
          size,
          contentType,
          cdnUrl,
          contentHash
        );
      } catch (error) {
        console.error('Sui registration failed:', error);
      }
    }

    // Solana would be implemented similarly
    
    return results;
  }

  /**
   * Get blob metadata from all configured chains
   */
  async getBlobMetadataMultiChain(blobId: string): Promise<Record<SupportedChain, OnChainBlobMetadata | null>> {
    const results: Record<SupportedChain, OnChainBlobMetadata | null> = {
      ethereum: null,
      sui: null,
      solana: null,
    };

    // Get from Ethereum
    if (this.config.ethereum) {
      try {
        results.ethereum = await this.getBlobMetadataFromEthereum(blobId);
      } catch (error) {
        console.error('Ethereum query failed:', error);
      }
    }

    // Get from Sui
    if (this.config.sui) {
      try {
        results.sui = await this.getBlobMetadataFromSui(blobId);
      } catch (error) {
        console.error('Sui query failed:', error);
      }
    }

    return results;
  }

  /**
   * Verify if blob exists on any configured chain
   */
  async verifyBlobExistsAnyChain(blobId: string): Promise<{ exists: boolean; chains: SupportedChain[] }> {
    const metadata = await this.getBlobMetadataMultiChain(blobId);
    const existingChains: SupportedChain[] = [];

    for (const [chain, data] of Object.entries(metadata)) {
      if (data !== null) {
        existingChains.push(chain as SupportedChain);
      }
    }

    return {
      exists: existingChains.length > 0,
      chains: existingChains,
    };
  }

  // =============================================================================
  // UTILITIES
  // =============================================================================

  /**
   * Estimate gas for blob registration on Ethereum
   */
  async estimateRegistrationGas(
    blobId: string,
    size: number,
    contentType: string,
    cdnUrl: string,
    contentHash: string
  ): Promise<bigint> {
    if (!this.ethereumContract) {
      throw new Error('Ethereum not configured');
    }

    const hashBytes = ethers.keccak256(ethers.toUtf8Bytes(contentHash));
    return await this.ethereumContract.registerBlob.estimateGas(
      blobId,
      size,
      contentType,
      cdnUrl,
      hashBytes
    );
  }

  /**
   * Get supported chains based on configuration
   */
  getSupportedChains(): SupportedChain[] {
    const chains: SupportedChain[] = [];
    if (this.config.ethereum) chains.push('ethereum');
    if (this.config.sui) chains.push('sui');
    if (this.config.solana) chains.push('solana');
    return chains;
  }

  /**
   * Check if a specific chain is configured
   */
  isChainConfigured(chain: SupportedChain): boolean {
    return this.getSupportedChains().includes(chain);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a blockchain integrator with simplified configuration
 */
export function createBlockchainIntegrator(config: BlockchainConfig): BlockchainIntegrator {
  return new BlockchainIntegrator(config);
}

/**
 * Helper to register blob on preferred chain
 */
export async function registerBlobOnPreferredChain(
  integrator: BlockchainIntegrator,
  blobId: string,
  size: number,
  contentType: string,
  cdnUrl: string,
  contentHash: string,
  preferredChain: SupportedChain = 'ethereum'
): Promise<string> {
  if (!integrator.isChainConfigured(preferredChain)) {
    const supportedChains = integrator.getSupportedChains();
    if (supportedChains.length === 0) {
      throw new Error('No blockchain networks configured');
    }
    preferredChain = supportedChains[0];
  }

  switch (preferredChain) {
    case 'ethereum':
      return await integrator.registerBlobOnEthereum(blobId, size, contentType, cdnUrl, contentHash);
    case 'sui':
      return await integrator.registerBlobOnSui(blobId, size, contentType, cdnUrl, contentHash);
    case 'solana':
      throw new Error('Solana integration not yet implemented');
    default:
      throw new Error(`Unsupported chain: ${preferredChain}`);
  }
}

/**
 * Helper to verify blob hash across all chains
 */
export async function verifyBlobHashMultiChain(
  integrator: BlockchainIntegrator,
  blobId: string,
  contentHash: string
): Promise<Record<SupportedChain, boolean | null>> {
  const results: Record<SupportedChain, boolean | null> = {
    ethereum: null,
    sui: null,
    solana: null,
  };

  if (integrator.isChainConfigured('ethereum')) {
    try {
      results.ethereum = await integrator.verifyBlobHashOnEthereum(blobId, contentHash);
    } catch (error) {
      console.error('Ethereum verification failed:', error);
    }
  }

  // Additional chains would be implemented similarly

  return results;
}

// =============================================================================
// CONSTANTS AND PRESETS
// =============================================================================

/**
 * Default Ethereum contract ABI for WalrusBlobRegistry
 */
export const WALRUS_BLOB_REGISTRY_ABI = [
  "function registerBlob(string blobId, uint256 size, string contentType, string cdnUrl, bytes32 contentHash)",
  "function registerBlobBatch(string[] blobIds, uint256[] sizes, string[] contentTypes, string[] cdnUrls, bytes32[] contentHashes)",
  "function pinBlob(string blobId)",
  "function unpinBlob(string blobId)",
  "function getBlobMetadata(string blobId) view returns (tuple(string blobId, address uploader, uint256 size, string contentType, uint256 timestamp, string cdnUrl, bool isPinned, bytes32 contentHash))",
  "function getBlobStatus(string blobId) view returns (bool exists, address uploader, bool isPinned)",
  "function verifyBlobHash(string blobId, bytes32 providedHash) view returns (bool)",
  "function getUploaderBlobs(address uploader) view returns (string[])",
  "function getBlobCount(address uploader) view returns (uint256)",
  "event BlobRegistered(string indexed blobId, address indexed uploader, uint256 size, string contentType, string cdnUrl)",
  "event BlobPinned(string indexed blobId, address indexed operator)",
  "event BlobUnpinned(string indexed blobId, address indexed operator)"
];

/**
 * Preset configurations for common networks
 */
export const PRESET_CONFIGS = {
  ethereum: {
    mainnet: (contractAddress: string, privateKey?: string) => ({
      rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/SVPGtLg2pMLIc57MJXG-R1En6DcnBB9K',
      contractAddress,
      abi: WALRUS_BLOB_REGISTRY_ABI,
      privateKey,
    }),
    sepolia: (contractAddress: string, privateKey?: string) => ({
      rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/SVPGtLg2pMLIc57MJXG-R1En6DcnBB9K',
      contractAddress,
      abi: WALRUS_BLOB_REGISTRY_ABI,
      privateKey,
    }),
  },
  sui: {
    mainnet: (packageId: string, privateKey?: string) => ({
      rpcUrl: getFullnodeUrl('mainnet'),
      packageId,
      privateKey,
    }),
    testnet: (packageId: string, privateKey?: string) => ({
      rpcUrl: getFullnodeUrl('testnet'),
      packageId,
      privateKey,
    }),
  },
};