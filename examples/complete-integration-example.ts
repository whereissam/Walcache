/**
 * Complete WCDN Integration Example
 * Demonstrates all features: Smart contracts, verification, webhooks, analytics
 */

import { WalrusCDNClient } from '@wcdn/sdk';
import { PRESET_CONFIGS, createBlockchainIntegrator } from '@wcdn/sdk/blockchain';
import express from 'express';
import { WebhookService } from './cdn-server/src/services/webhook.js';
import { OnChainVerificationService } from './cdn-server/src/services/verification.js';

// =============================================================================
// COMPLETE SETUP EXAMPLE
// =============================================================================

export class CompleteWCDNIntegration {
  private wcdnClient: WalrusCDNClient;
  private webhookService: WebhookService;
  private verificationService: OnChainVerificationService;
  private app: express.Application;

  constructor() {
    this.setupWCDNClient();
    this.setupWebhookService();
    this.setupVerificationService();
    this.setupExpressApp();
  }

  private setupWCDNClient() {
    // Initialize WCDN client with full blockchain integration
    this.wcdnClient = new WalrusCDNClient(
      {
        baseUrl: 'https://your-wcdn-instance.com',
        apiKey: process.env.WCDN_API_KEY,
        timeout: 30000,
      },
      {
        ethereum: PRESET_CONFIGS.ethereum.mainnet(
          process.env.ETHEREUM_CONTRACT_ADDRESS!,
          process.env.ETHEREUM_PRIVATE_KEY
        ),
        sui: PRESET_CONFIGS.sui.mainnet(
          process.env.SUI_PACKAGE_ID!,
          process.env.SUI_PRIVATE_KEY
        ),
      }
    );
  }

  private setupWebhookService() {
    this.webhookService = new WebhookService();
  }

  private setupVerificationService() {
    this.verificationService = new OnChainVerificationService({
      ethereum: {
        rpcUrl: process.env.ETHEREUM_RPC_URL!,
        contractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS!,
        abi: [], // Include actual ABI
      },
      sui: {
        rpcUrl: process.env.SUI_RPC_URL!,
        packageId: process.env.SUI_PACKAGE_ID!,
      },
    });
  }

  private setupExpressApp() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  // =============================================================================
  // COMPLETE WORKFLOW EXAMPLES
  // =============================================================================

  /**
   * Example 1: Complete file upload with blockchain registration and verification
   */
  async uploadWithFullIntegration(file: File, options: {
    chain?: 'ethereum' | 'sui';
    vaultId?: string;
    enableVerification?: boolean;
    enableWebhooks?: boolean;
  } = {}) {
    console.log('🚀 Starting complete upload workflow...');

    try {
      // Step 1: Upload to WCDN
      console.log('📤 Uploading file to WCDN...');
      const upload = await this.wcdnClient.createUpload(file, {
        vault_id: options.vaultId,
      });

      // Send upload webhook
      if (options.enableWebhooks) {
        await this.webhookService.sendWebhook('blob.uploaded', {
          blobId: upload.blob_id,
          filename: upload.filename,
          size: upload.size,
          contentType: upload.content_type,
          cdnUrl: this.wcdnClient.getCDNUrl(upload.blob_id),
        });
      }

      // Step 2: Register on blockchain
      const chain = options.chain || 'ethereum';
      console.log(`⛓️ Registering on ${chain} blockchain...`);
      
      const txHashes = await this.wcdnClient.registerBlobOnChain(
        upload.blob_id,
        {
          size: upload.size,
          contentType: upload.content_type,
          cdnUrl: this.wcdnClient.getCDNUrl(upload.blob_id),
          contentHash: upload.blob_id, // In practice, compute actual hash
        },
        chain
      );

      // Send blockchain registration webhook
      if (options.enableWebhooks && txHashes[chain]) {
        await this.webhookService.sendWebhook('blockchain.registered', {
          blobId: upload.blob_id,
          chain,
          transactionHash: txHashes[chain],
          uploader: 'current_user_address',
        });
      }

      // Step 3: Verify registration
      if (options.enableVerification) {
        console.log('🔍 Verifying blockchain registration...');
        
        const verificationResult = await this.verificationService.verifyCrossChain({
          blobId: upload.blob_id,
          chains: [chain],
          includeMetadata: true,
          computeHash: false,
        });

        // Send verification webhook
        if (options.enableWebhooks) {
          await this.webhookService.sendWebhook('blob.verified', {
            blobId: upload.blob_id,
            chains: Object.keys(verificationResult.chains),
            overallVerified: verificationResult.overallVerified,
            consensusLevel: verificationResult.consensusLevel,
          });
        }

        console.log('✅ Upload workflow completed successfully!');
        
        return {
          upload,
          blockchainTx: txHashes[chain],
          verification: verificationResult,
          cdnUrl: this.wcdnClient.getCDNUrl(upload.blob_id),
        };
      }

      console.log('✅ Upload and registration completed!');
      
      return {
        upload,
        blockchainTx: txHashes[chain],
        cdnUrl: this.wcdnClient.getCDNUrl(upload.blob_id),
      };

    } catch (error) {
      console.error('❌ Upload workflow failed:', error);
      throw error;
    }
  }

  /**
   * Example 2: Batch upload with optimized blockchain registration
   */
  async batchUploadWithBlockchain(files: File[], options: {
    chain?: 'ethereum' | 'sui';
    batchSize?: number;
    enableVerification?: boolean;
  } = {}) {
    console.log(`📦 Starting batch upload of ${files.length} files...`);

    const chain = options.chain || 'ethereum';
    const batchSize = options.batchSize || 10;

    try {
      // Step 1: Upload all files to WCDN
      console.log('📤 Uploading files to WCDN...');
      const uploads = await this.wcdnClient.createBatchUpload(files, {
        concurrency: 3,
      });

      // Step 2: Register in batches on blockchain
      console.log(`⛓️ Registering batches on ${chain}...`);
      const txHashes = [];

      for (let i = 0; i < uploads.length; i += batchSize) {
        const batch = uploads.slice(i, i + batchSize);
        const blobsToRegister = batch.map(upload => ({
          blobId: upload.blob_id,
          size: upload.size,
          contentType: upload.content_type,
          cdnUrl: this.wcdnClient.getCDNUrl(upload.blob_id),
          contentHash: upload.blob_id,
        }));

        const txHash = await this.wcdnClient.registerBlobBatchOnChain(blobsToRegister, chain);
        txHashes.push(txHash);
        
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} registered: ${txHash}`);
      }

      // Step 3: Optional verification
      if (options.enableVerification) {
        console.log('🔍 Verifying batch registrations...');
        
        const verificationPromises = uploads.map(upload =>
          this.verificationService.verifyCrossChain({
            blobId: upload.blob_id,
            chains: [chain],
            includeMetadata: false,
            computeHash: false,
          })
        );

        const verificationResults = await Promise.all(verificationPromises);
        const verifiedCount = verificationResults.filter(r => r.overallVerified).length;
        
        console.log(`✅ Verification completed: ${verifiedCount}/${uploads.length} verified`);
      }

      console.log('🎉 Batch upload workflow completed!');
      
      return {
        uploads,
        blockchainTxs: txHashes,
        cdnUrls: uploads.map(upload => this.wcdnClient.getCDNUrl(upload.blob_id)),
      };

    } catch (error) {
      console.error('❌ Batch upload failed:', error);
      throw error;
    }
  }

  /**
   * Example 3: Multi-chain verification and consensus
   */
  async multiChainVerification(blobId: string) {
    console.log(`🔍 Starting multi-chain verification for ${blobId}...`);

    try {
      // Verify across all available chains
      const result = await this.verificationService.verifyCrossChain({
        blobId,
        chains: ['ethereum', 'sui'],
        includeMetadata: true,
        computeHash: false,
      });

      console.log('📊 Verification Results:');
      console.log(`Overall verified: ${result.overallVerified}`);
      console.log(`Consensus level: ${result.consensusLevel}`);
      console.log(`Trusted chains: ${result.trustedChains.join(', ')}`);

      // Check individual chain results
      Object.entries(result.chains).forEach(([chain, chainResult]) => {
        if (chainResult.success) {
          console.log(`✅ ${chain}: ${chainResult.verified ? 'Verified' : 'Not verified'}`);
          if (chainResult.metadata) {
            console.log(`   Uploader: ${chainResult.metadata.uploader}`);
            console.log(`   Size: ${chainResult.metadata.size} bytes`);
            console.log(`   Pinned: ${chainResult.metadata.isPinned}`);
          }
        } else {
          console.log(`❌ ${chain}: ${chainResult.error}`);
        }
      });

      // Send analytics webhook if consensus is poor
      if (result.consensusLevel === 'minority' || result.consensusLevel === 'none') {
        await this.webhookService.sendWebhook('analytics.threshold', {
          metric: 'verification_consensus',
          value: result.trustedChains.length,
          threshold: 2,
          severity: 'warning',
          blobId,
        });
      }

      return result;

    } catch (error) {
      console.error('❌ Multi-chain verification failed:', error);
      throw error;
    }
  }

  // =============================================================================
  // EXPRESS.JS INTEGRATION
  // =============================================================================

  private setupRoutes() {
    // Complete upload endpoint
    this.app.post('/api/complete-upload', async (req, res) => {
      try {
        const { file, chain, enableVerification } = req.body;
        
        const result = await this.uploadWithFullIntegration(file, {
          chain,
          enableVerification,
          enableWebhooks: true,
        });

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Verification endpoint
    this.app.get('/api/verify/:blobId', async (req, res) => {
      try {
        const { blobId } = req.params;
        const result = await this.multiChainVerification(blobId);

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Analytics endpoint with webhook integration
    this.app.get('/api/analytics/realtime', async (req, res) => {
      try {
        const analytics = await this.wcdnClient.getGlobalAnalytics();
        
        // Check for threshold violations
        const hitRate = analytics.global.cache_hits / analytics.global.total_requests;
        if (hitRate < 0.7) {
          await this.webhookService.sendWebhook('analytics.threshold', {
            metric: 'cache_hit_rate',
            value: hitRate,
            threshold: 0.7,
            severity: 'warning',
          });
        }

        res.json({
          success: true,
          data: analytics,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Webhook management
    this.app.post('/api/webhooks', async (req, res) => {
      try {
        const endpoint = await this.webhookService.createEndpoint(req.body);
        res.json({ success: true, data: endpoint });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      const health = {
        status: 'healthy',
        services: {
          wcdn: await this.wcdnClient.healthCheck(),
          blockchain: this.wcdnClient.isBlockchainIntegrationAvailable(),
          verification: this.verificationService.isChainAvailable('ethereum'),
          webhooks: true,
        },
        timestamp: new Date().toISOString(),
      };

      const isHealthy = Object.values(health.services).every(Boolean);
      res.status(isHealthy ? 200 : 503).json(health);
    });
  }

  // =============================================================================
  // STARTUP AND MANAGEMENT
  // =============================================================================

  async start(port = 3000) {
    // Setup webhook endpoint for demonstrations
    await this.setupDemoWebhook();

    this.app.listen(port, () => {
      console.log(`🚀 Complete WCDN integration server running on port ${port}`);
      console.log('📋 Available endpoints:');
      console.log('  POST /api/complete-upload - Complete upload workflow');
      console.log('  GET  /api/verify/:blobId - Multi-chain verification');
      console.log('  GET  /api/analytics/realtime - Real-time analytics');
      console.log('  POST /api/webhooks - Webhook management');
      console.log('  GET  /health - Service health check');
    });
  }

  private async setupDemoWebhook() {
    try {
      await this.webhookService.createEndpoint({
        url: 'https://webhook.site/your-webhook-url',
        secret: 'your-webhook-secret-key-32-chars-min',
        events: [
          'blob.uploaded',
          'blob.verified',
          'blockchain.registered',
          'analytics.threshold',
        ],
        active: true,
      });
      
      console.log('✅ Demo webhook endpoint configured');
    } catch (error) {
      console.warn('⚠️ Could not setup demo webhook:', error.message);
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down WCDN integration...');
    this.webhookService.shutdown();
    console.log('✅ Shutdown complete');
  }
}

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

async function runCompleteExample() {
  const integration = new CompleteWCDNIntegration();
  
  try {
    // Start the server
    await integration.start(3000);
    
    // Example file upload workflow
    /* 
    const file = new File(['Hello, WCDN!'], 'example.txt', { type: 'text/plain' });
    
    const result = await integration.uploadWithFullIntegration(file, {
      chain: 'ethereum',
      enableVerification: true,
      enableWebhooks: true,
    });
    
    console.log('Upload result:', result);
    
    // Example multi-chain verification
    const verification = await integration.multiChainVerification(result.upload.blob_id);
    console.log('Verification result:', verification);
    */
    
  } catch (error) {
    console.error('Example failed:', error);
    await integration.shutdown();
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runCompleteExample().catch(console.error);
}

export { CompleteWCDNIntegration };