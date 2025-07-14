/**
 * On-Chain Verification API Routes (v1)
 */

import { FastifyInstance } from 'fastify';
import { OnChainVerificationService, BatchVerificationProcessor } from '../../services/verification.js';
// TODO: Fix blockchain import - commenting out for now
// import { WALRUS_BLOB_REGISTRY_ABI } from '../../../blockchain.js';

// Initialize verification service (would be injected in real app)
const verificationConfig = {
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/SVPGtLg2pMLIc57MJXG-R1En6DcnBB9K',
    contractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567890',
    abi: [], // TODO: Fix blockchain ABI import
  },
  sui: {
    rpcUrl: process.env.SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443',
    packageId: process.env.SUI_PACKAGE_ID || '0x...',
  },
};

const verificationService = new OnChainVerificationService(verificationConfig);
const batchProcessor = new BatchVerificationProcessor(verificationService);

export async function verificationRoutes(fastify: FastifyInstance) {
  
  // =============================================================================
  // SINGLE BLOB VERIFICATION
  // =============================================================================

  // Verify blob across all chains
  fastify.get<{ 
    Params: { blobId: string };
    Querystring: { 
      chains?: string;
      includeMetadata?: boolean;
      computeHash?: boolean;
    }
  }>('/verification/:blobId', async (request, reply) => {
    try {
      const { blobId } = request.params;
      const { chains, includeMetadata = true, computeHash = false } = request.query;
      
      const targetChains = chains ? chains.split(',') as any[] : undefined;

      const result = await verificationService.verifyCrossChain({
        blobId,
        chains: targetChains,
        includeMetadata,
        computeHash,
      });

      return reply.send({
        object: 'verification_result',
        created: Math.floor(Date.now() / 1000),
        data: result,
      });
    } catch (error) {
      return reply.status(400).send({
        error: {
          type: 'validation_error',
          message: error.message,
        },
      });
    }
  });

  // Verify blob with content
  fastify.post<{ 
    Params: { blobId: string };
    Body: {
      content?: string; // base64 encoded
      contentUrl?: string;
      chains?: string[];
      includeMetadata?: boolean;
    }
  }>('/verification/:blobId/verify-content', async (request, reply) => {
    try {
      const { blobId } = request.params;
      const { content, contentUrl, chains, includeMetadata = true } = request.body;

      let contentBuffer: Buffer | undefined;
      if (content) {
        contentBuffer = Buffer.from(content, 'base64');
      }

      const result = await verificationService.verifyCrossChain({
        blobId,
        content: contentBuffer,
        contentUrl,
        chains,
        includeMetadata,
        computeHash: true,
      });

      return reply.send({
        object: 'verification_result',
        created: Math.floor(Date.now() / 1000),
        data: result,
      });
    } catch (error) {
      return reply.status(400).send({
        error: {
          type: 'validation_error',
          message: error.message,
        },
      });
    }
  });

  // Verify blob on specific chain
  fastify.get<{ 
    Params: { blobId: string; chain: string };
    Querystring: { 
      includeMetadata?: boolean;
      expectedHash?: string;
    }
  }>('/verification/:blobId/chains/:chain', async (request, reply) => {
    try {
      const { blobId, chain } = request.params;
      const { includeMetadata = true, expectedHash } = request.query;

      const result = await verificationService.verifyOnChain(
        chain as any, 
        blobId, 
        expectedHash,
        { includeMetadata }
      );

      return reply.send({
        object: 'chain_verification_result',
        created: Math.floor(Date.now() / 1000),
        data: result,
      });
    } catch (error) {
      return reply.status(400).send({
        error: {
          type: 'validation_error',
          message: error.message,
        },
      });
    }
  });

  // =============================================================================
  // BATCH VERIFICATION
  // =============================================================================

  // Verify multiple blobs
  fastify.post<{
    Body: {
      blobs: Array<{
        blobId: string;
        content?: string; // base64 encoded
        contentUrl?: string;
      }>;
      chains?: string[];
      concurrency?: number;
      failFast?: boolean;
      includeMetadata?: boolean;
    }
  }>('/verification/batch', async (request, reply) => {
    try {
      const { blobs, chains, concurrency = 5, failFast = false, includeMetadata = true } = request.body;

      if (!blobs || blobs.length === 0) {
        return reply.status(400).send({
          error: {
            type: 'validation_error',
            message: 'At least one blob must be provided',
          },
        });
      }

      // Convert to verification requests
      const requests = blobs.map(blob => ({
        blobId: blob.blobId,
        content: blob.content ? Buffer.from(blob.content, 'base64') : undefined,
        contentUrl: blob.contentUrl,
        chains,
        includeMetadata,
        computeHash: !!(blob.content || blob.contentUrl),
      }));

      const results = await batchProcessor.verifyBatch(requests, {
        concurrency,
        failFast,
      });

      const report = batchProcessor.generateBatchReport(results);

      return reply.send({
        object: 'batch_verification_result',
        created: Math.floor(Date.now() / 1000),
        data: {
          results,
          summary: report.summary,
          chainBreakdown: report.chainBreakdown,
          failedBlobs: report.failedBlobs,
        },
      });
    } catch (error) {
      return reply.status(400).send({
        error: {
          type: 'validation_error',
          message: error.message,
        },
      });
    }
  });

  // =============================================================================
  // VERIFICATION STATISTICS
  // =============================================================================

  // Get verification service stats
  fastify.get('/verification/stats', async (request, reply) => {
    try {
      const stats = await verificationService.getVerificationStats();

      return reply.send({
        object: 'verification_stats',
        created: Math.floor(Date.now() / 1000),
        data: stats,
      });
    } catch (error) {
      return reply.status(500).send({
        error: {
          type: 'api_error',
          message: error.message,
        },
      });
    }
  });

  // Get available chains
  fastify.get('/verification/chains', async (request, reply) => {
    const chains = [
      {
        name: 'ethereum',
        available: verificationService.isChainAvailable('ethereum'),
        description: 'Ethereum mainnet with WalrusBlobRegistry contract',
        features: ['metadata_storage', 'hash_verification', 'pinning', 'batch_operations'],
      },
      {
        name: 'sui',
        available: verificationService.isChainAvailable('sui'),
        description: 'Sui network with Move-based blob registry',
        features: ['metadata_storage', 'hash_verification', 'events'],
      },
      {
        name: 'solana',
        available: verificationService.isChainAvailable('solana'),
        description: 'Solana network (coming soon)',
        features: ['planned'],
      },
    ];

    return reply.send({
      object: 'chain_list',
      created: Math.floor(Date.now() / 1000),
      data: chains,
    });
  });

  // =============================================================================
  // VERIFICATION HEALTH CHECK
  // =============================================================================

  // Health check for verification service
  fastify.get('/verification/health', async (request, reply) => {
    const health = {
      status: 'healthy',
      chains: {} as Record<string, any>,
      timestamp: new Date().toISOString(),
    };

    // Check each chain
    const chains = ['ethereum', 'sui', 'solana'] as const;
    
    for (const chain of chains) {
      try {
        if (verificationService.isChainAvailable(chain)) {
          // Perform basic health check
          await verificationService.verifyOnChain(chain, 'health-check-blob', undefined, {});
          health.chains[chain] = { status: 'healthy', available: true };
        } else {
          health.chains[chain] = { status: 'unavailable', available: false };
        }
      } catch (error) {
        health.chains[chain] = { 
          status: 'unhealthy', 
          available: true, 
          error: error.message 
        };
        health.status = 'degraded';
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    return reply.status(statusCode).send({
      object: 'health_check',
      data: health,
    });
  });
}