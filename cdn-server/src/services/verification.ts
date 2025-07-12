/**
 * On-Chain Verification Service
 * Handles blockchain-based content verification and integrity checks
 */

import { ethers } from 'ethers';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import crypto from 'crypto';
import { z } from 'zod';

// =============================================================================
// TYPES AND SCHEMAS
// =============================================================================

export type SupportedChain = 'ethereum' | 'sui' | 'solana';

export interface VerificationConfig {
  ethereum?: {
    rpcUrl: string;
    contractAddress: string;
    abi: any[];
  };
  sui?: {
    rpcUrl: string;
    packageId: string;
  };
  solana?: {
    rpcUrl: string;
    programId: string;
  };
}

export interface VerificationResult {
  success: boolean;
  chain: SupportedChain;
  blobId: string;
  verified: boolean;
  onChainHash?: string;
  computedHash?: string;
  metadata?: {
    uploader: string;
    timestamp: number;
    size: number;
    contentType: string;
    isPinned: boolean;
  };
  blockNumber?: number;
  transactionHash?: string;
  error?: string;
}

export interface CrossChainVerificationResult {
  blobId: string;
  overallVerified: boolean;
  chains: Record<SupportedChain, VerificationResult>;
  consensusLevel: 'unanimous' | 'majority' | 'minority' | 'none';
  trustedChains: SupportedChain[];
}

// Input validation schemas
const verificationRequestSchema = z.object({
  blobId: z.string().min(1, 'Blob ID is required'),
  content: z.instanceof(Buffer).optional(),
  contentUrl: z.string().url().optional(),
  chains: z.array(z.enum(['ethereum', 'sui', 'solana'])).optional(),
  computeHash: z.boolean().default(true),
  includeMetadata: z.boolean().default(true),
});

type VerificationRequest = z.infer<typeof verificationRequestSchema>;

// =============================================================================
// VERIFICATION SERVICE CLASS
// =============================================================================

export class OnChainVerificationService {
  private config: VerificationConfig;
  private ethereumProvider?: ethers.JsonRpcProvider;
  private ethereumContract?: ethers.Contract;
  private suiClient?: SuiClient;

  constructor(config: VerificationConfig) {
    this.config = config;
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

    // Solana would be initialized similarly
  }

  // =============================================================================
  // MAIN VERIFICATION METHODS
  // =============================================================================

  /**
   * Verify a blob across all configured chains
   */
  async verifyCrossChain(request: VerificationRequest): Promise<CrossChainVerificationResult> {
    const validatedRequest = verificationRequestSchema.parse(request);
    const { blobId, content, contentUrl, chains } = validatedRequest;

    // Determine which chains to check
    const targetChains = chains || this.getAvailableChains();
    
    // Compute content hash if content is provided
    let computedHash: string | undefined;
    if (content) {
      computedHash = this.computeContentHash(content);
    } else if (contentUrl) {
      try {
        const fetchedContent = await this.fetchContent(contentUrl);
        computedHash = this.computeContentHash(fetchedContent);
      } catch (error) {
        console.warn(`Failed to fetch content from ${contentUrl}:`, error.message);
      }
    }

    // Verify on each chain in parallel
    const verificationPromises = targetChains.map(async (chain) => {
      try {
        return await this.verifyOnChain(chain, blobId, computedHash, validatedRequest);
      } catch (error) {
        return {
          success: false,
          chain,
          blobId,
          verified: false,
          error: error.message,
        } as VerificationResult;
      }
    });

    const results = await Promise.all(verificationPromises);
    
    // Build result map
    const chainResults: Record<SupportedChain, VerificationResult> = {} as any;
    results.forEach(result => {
      chainResults[result.chain] = result;
    });

    // Analyze consensus
    const verifiedChains = results.filter(r => r.success && r.verified).map(r => r.chain);
    const totalChains = targetChains.length;
    const verifiedCount = verifiedChains.length;

    let consensusLevel: 'unanimous' | 'majority' | 'minority' | 'none';
    if (verifiedCount === totalChains) {
      consensusLevel = 'unanimous';
    } else if (verifiedCount > totalChains / 2) {
      consensusLevel = 'majority';
    } else if (verifiedCount > 0) {
      consensusLevel = 'minority';
    } else {
      consensusLevel = 'none';
    }

    return {
      blobId,
      overallVerified: consensusLevel === 'unanimous' || consensusLevel === 'majority',
      chains: chainResults,
      consensusLevel,
      trustedChains: verifiedChains,
    };
  }

  /**
   * Verify a blob on a specific chain
   */
  async verifyOnChain(
    chain: SupportedChain,
    blobId: string,
    expectedHash?: string,
    options: { includeMetadata?: boolean } = {}
  ): Promise<VerificationResult> {
    switch (chain) {
      case 'ethereum':
        return await this.verifyOnEthereum(blobId, expectedHash, options);
      case 'sui':
        return await this.verifyOnSui(blobId, expectedHash, options);
      case 'solana':
        throw new Error('Solana verification not yet implemented');
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  }

  // =============================================================================
  // ETHEREUM VERIFICATION
  // =============================================================================

  private async verifyOnEthereum(
    blobId: string,
    expectedHash?: string,
    options: { includeMetadata?: boolean } = {}
  ): Promise<VerificationResult> {
    if (!this.ethereumContract || !this.ethereumProvider) {
      throw new Error('Ethereum not configured');
    }

    try {
      // Check if blob exists on chain
      const [exists, uploader, isPinned] = await this.ethereumContract.getBlobStatus(blobId);
      
      if (!exists) {
        return {
          success: true,
          chain: 'ethereum',
          blobId,
          verified: false,
          error: 'Blob not registered on Ethereum',
        };
      }

      // Get full metadata if requested
      let metadata: any;
      let onChainHash: string | undefined;
      
      if (options.includeMetadata) {
        try {
          const fullMetadata = await this.ethereumContract.getBlobMetadata(blobId);
          metadata = {
            uploader: fullMetadata.uploader,
            timestamp: Number(fullMetadata.timestamp),
            size: Number(fullMetadata.size),
            contentType: fullMetadata.contentType,
            isPinned: fullMetadata.isPinned,
          };
          onChainHash = fullMetadata.contentHash;
        } catch (error) {
          console.warn('Failed to fetch full metadata:', error.message);
        }
      }

      // Verify hash if provided
      let verified = true;
      if (expectedHash && onChainHash) {
        // Convert expected hash to bytes32 format for comparison
        const expectedBytes32 = ethers.keccak256(ethers.toUtf8Bytes(expectedHash));
        verified = onChainHash === expectedBytes32;
        
        // Alternative: use contract's verify function
        try {
          verified = await this.ethereumContract.verifyBlobHash(blobId, expectedBytes32);
        } catch (error) {
          console.warn('Hash verification failed:', error.message);
          verified = false;
        }
      }

      // Get current block number
      const blockNumber = await this.ethereumProvider.getBlockNumber();

      return {
        success: true,
        chain: 'ethereum',
        blobId,
        verified,
        onChainHash,
        computedHash: expectedHash,
        metadata,
        blockNumber,
      };

    } catch (error) {
      return {
        success: false,
        chain: 'ethereum',
        blobId,
        verified: false,
        error: error.message,
      };
    }
  }

  // =============================================================================
  // SUI VERIFICATION
  // =============================================================================

  private async verifyOnSui(
    blobId: string,
    expectedHash?: string,
    options: { includeMetadata?: boolean } = {}
  ): Promise<VerificationResult> {
    if (!this.suiClient || !this.config.sui) {
      throw new Error('Sui not configured');
    }

    try {
      // This would require calling the Sui Move module
      // For now, return a mock response indicating Sui integration is in progress
      return {
        success: true,
        chain: 'sui',
        blobId,
        verified: false,
        error: 'Sui verification implementation in progress',
      };

      // TODO: Implement actual Sui verification
      // const result = await this.suiClient.call({
      //   target: `${this.config.sui.packageId}::blob_registry::get_blob_status`,
      //   arguments: [blobId],
      // });

    } catch (error) {
      return {
        success: false,
        chain: 'sui',
        blobId,
        verified: false,
        error: error.message,
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Compute SHA-256 hash of content
   */
  private computeContentHash(content: Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Fetch content from URL
   */
  private async fetchContent(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Get available chains based on configuration
   */
  private getAvailableChains(): SupportedChain[] {
    const chains: SupportedChain[] = [];
    if (this.config.ethereum) chains.push('ethereum');
    if (this.config.sui) chains.push('sui');
    if (this.config.solana) chains.push('solana');
    return chains;
  }

  /**
   * Check if a specific chain is configured
   */
  isChainAvailable(chain: SupportedChain): boolean {
    return this.getAvailableChains().includes(chain);
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(chains?: SupportedChain[]): Promise<{
    totalVerifications: number;
    successfulVerifications: number;
    chainStats: Record<SupportedChain, { available: boolean; verifications: number }>;
  }> {
    // This would typically query a database or metrics store
    // For now, return a mock implementation
    const targetChains = chains || this.getAvailableChains();
    
    const chainStats: Record<SupportedChain, { available: boolean; verifications: number }> = {} as any;
    targetChains.forEach(chain => {
      chainStats[chain] = {
        available: this.isChainAvailable(chain),
        verifications: 0, // TODO: Implement actual metrics
      };
    });

    return {
      totalVerifications: 0,
      successfulVerifications: 0,
      chainStats,
    };
  }
}

// =============================================================================
// VERIFICATION MIDDLEWARE FOR EXPRESS/FASTIFY
// =============================================================================

export interface VerificationMiddlewareOptions {
  verificationService: OnChainVerificationService;
  enableCaching?: boolean;
  cacheTimeout?: number;
  requireVerification?: boolean;
  trustedChains?: SupportedChain[];
}

/**
 * Create verification middleware for web frameworks
 */
export function createVerificationMiddleware(options: VerificationMiddlewareOptions) {
  const { verificationService, requireVerification = false, trustedChains } = options;
  
  // Simple in-memory cache for verification results
  const verificationCache = new Map<string, { result: CrossChainVerificationResult; timestamp: number }>();
  const cacheTimeout = options.cacheTimeout || 300000; // 5 minutes default

  return async (req: any, res: any, next: any) => {
    try {
      const blobId = req.params.blobId || req.params.cid;
      
      if (!blobId) {
        return next();
      }

      // Check cache first
      if (options.enableCaching) {
        const cached = verificationCache.get(blobId);
        if (cached && Date.now() - cached.timestamp < cacheTimeout) {
          req.verificationResult = cached.result;
          return next();
        }
      }

      // Perform verification
      const verificationResult = await verificationService.verifyCrossChain({
        blobId,
        chains: trustedChains,
        computeHash: false, // Don't recompute hash for middleware
        includeMetadata: true,
      });

      // Cache result
      if (options.enableCaching) {
        verificationCache.set(blobId, {
          result: verificationResult,
          timestamp: Date.now(),
        });
      }

      // Attach result to request
      req.verificationResult = verificationResult;

      // Block request if verification is required and failed
      if (requireVerification && !verificationResult.overallVerified) {
        return res.status(403).json({
          error: 'Content verification failed',
          details: verificationResult,
        });
      }

      next();
    } catch (error) {
      if (requireVerification) {
        return res.status(500).json({
          error: 'Verification service error',
          message: error.message,
        });
      }
      
      // Continue without verification if not required
      next();
    }
  };
}

// =============================================================================
// BATCH VERIFICATION UTILITIES
// =============================================================================

export class BatchVerificationProcessor {
  constructor(private verificationService: OnChainVerificationService) {}

  /**
   * Verify multiple blobs in parallel with concurrency control
   */
  async verifyBatch(
    requests: VerificationRequest[],
    options: { concurrency?: number; failFast?: boolean } = {}
  ): Promise<CrossChainVerificationResult[]> {
    const { concurrency = 5, failFast = false } = options;
    const results: CrossChainVerificationResult[] = [];
    
    // Process in batches to control concurrency
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      
      try {
        const batchPromises = batch.map(request => 
          this.verificationService.verifyCrossChain(request)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Check for failures if fail-fast is enabled
        if (failFast && batchResults.some(result => !result.overallVerified)) {
          throw new Error('Batch verification failed: one or more blobs failed verification');
        }
        
      } catch (error) {
        if (failFast) {
          throw error;
        }
        
        // Add error results for failed batch
        batch.forEach(request => {
          results.push({
            blobId: request.blobId,
            overallVerified: false,
            chains: {} as any,
            consensusLevel: 'none',
            trustedChains: [],
          });
        });
      }
    }
    
    return results;
  }

  /**
   * Generate verification report for multiple blobs
   */
  generateBatchReport(results: CrossChainVerificationResult[]): {
    summary: {
      total: number;
      verified: number;
      failed: number;
      successRate: number;
    };
    chainBreakdown: Record<SupportedChain, { verified: number; total: number; rate: number }>;
    failedBlobs: string[];
  } {
    const total = results.length;
    const verified = results.filter(r => r.overallVerified).length;
    const failed = total - verified;
    
    // Chain breakdown
    const chainBreakdown: Record<SupportedChain, { verified: number; total: number; rate: number }> = {} as any;
    const chains: SupportedChain[] = ['ethereum', 'sui', 'solana'];
    
    chains.forEach(chain => {
      const chainResults = results.map(r => r.chains[chain]).filter(Boolean);
      const chainVerified = chainResults.filter(r => r.verified).length;
      const chainTotal = chainResults.length;
      
      chainBreakdown[chain] = {
        verified: chainVerified,
        total: chainTotal,
        rate: chainTotal > 0 ? chainVerified / chainTotal : 0,
      };
    });
    
    return {
      summary: {
        total,
        verified,
        failed,
        successRate: total > 0 ? verified / total : 0,
      },
      chainBreakdown,
      failedBlobs: results.filter(r => !r.overallVerified).map(r => r.blobId),
    };
  }
}