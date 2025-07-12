/**
 * Verification Middleware for Automatic Content Verification
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { OnChainVerificationService, createVerificationMiddleware } from '../services/verification.js';
import { webhookService } from '../routes/webhooks.js';

// Initialize verification service for middleware
const verificationConfig = {
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/SVPGtLg2pMLIc57MJXG-R1En6DcnBB9K',
    contractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS || '0x1234567890123456789012345678901234567890',
    abi: [], // Would include actual ABI
  },
};

const verificationService = new OnChainVerificationService(verificationConfig);

// Create verification middleware with webhook integration
export const contentVerificationMiddleware = createVerificationMiddleware({
  verificationService,
  enableCaching: true,
  cacheTimeout: 300000, // 5 minutes
  requireVerification: process.env.REQUIRE_VERIFICATION === 'true',
  trustedChains: ['ethereum', 'sui'],
});

// Enhanced middleware with webhook notifications
export async function enhancedVerificationMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  next: Function
) {
  try {
    // Run base verification middleware
    await new Promise<void>((resolve, reject) => {
      contentVerificationMiddleware(request, reply, (error?: any) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Send verification webhook if verification was performed
    if ((request as any).verificationResult) {
      const result = (request as any).verificationResult;
      
      // Send webhook notification
      await webhookService.sendWebhook('blob.verified', {
        blobId: result.blobId,
        chains: Object.keys(result.chains),
        overallVerified: result.overallVerified,
        consensusLevel: result.consensusLevel,
        trustedChains: result.trustedChains,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  } catch (error) {
    reply.status(500).send({
      error: {
        type: 'verification_error',
        message: error.message,
      },
    });
  }
}