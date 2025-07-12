/**
 * Next.js Integration Example for WCDN SDK
 * Demonstrates full-stack blockchain integration with React
 */

import { WalrusCDNClient } from '@wcdn/sdk';
import { PRESET_CONFIGS, WALRUS_BLOB_REGISTRY_ABI } from '@wcdn/sdk/blockchain';
import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react'; // For Solana
import { useAccount, useWalletClient } from 'wagmi'; // For Ethereum
import { useWallet as useSuiWallet } from '@suiet/wallet-kit'; // For Sui

// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================

// Initialize WCDN client with multi-chain support
const wcdnClient = new WalrusCDNClient(
  {
    baseUrl: 'https://your-wcdn-instance.com',
    apiKey: process.env.NEXT_PUBLIC_WCDN_API_KEY,
    timeout: 30000,
  },
  {
    ethereum: PRESET_CONFIGS.ethereum.mainnet(
      '0x1234567890123456789012345678901234567890', // Your deployed contract address
      process.env.ETHEREUM_PRIVATE_KEY
    ),
    sui: PRESET_CONFIGS.sui.mainnet(
      '0x...', // Your deployed package ID
      process.env.SUI_PRIVATE_KEY
    ),
  }
);

// =============================================================================
// REACT HOOKS FOR MULTI-CHAIN INTEGRATION
// =============================================================================

export function useWCDNUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);

  const uploadWithBlockchainRegistration = useCallback(async (
    files: File[],
    options: {
      chain?: 'ethereum' | 'sui' | 'solana';
      vaultId?: string;
      registerOnChain?: boolean;
    } = {}
  ) => {
    setUploading(true);
    setError(null);
    
    try {
      // 1. Upload files to WCDN in batch
      const uploads = await wcdnClient.createBatchUpload(files, {
        vault_id: options.vaultId,
        concurrency: 3,
      });

      // 2. Register on blockchain if requested
      if (options.registerOnChain && options.chain) {
        const blobsToRegister = uploads.map(upload => ({
          blobId: upload.blob_id,
          size: upload.size,
          contentType: upload.content_type,
          cdnUrl: wcdnClient.getCDNUrl(upload.blob_id),
          contentHash: upload.blob_id, // In practice, you'd compute this
        }));

        if (blobsToRegister.length > 1) {
          // Use batch registration for multiple files
          const txHash = await wcdnClient.registerBlobBatchOnChain(blobsToRegister, options.chain);
          console.log(`Batch registered on ${options.chain}:`, txHash);
        } else {
          // Single file registration
          const txHashes = await wcdnClient.registerBlobOnChain(
            blobsToRegister[0].blobId,
            blobsToRegister[0],
            options.chain
          );
          console.log(`Registered on ${options.chain}:`, txHashes[options.chain]);
        }
      }

      return uploads;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw new Error(message);
    } finally {
      setUploading(false);
    }
  }, []);

  return {
    uploadWithBlockchainRegistration,
    uploading,
    uploadProgress,
    error,
  };
}

export function useWCDNBlobStatus() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const checkMultiChainStatus = useCallback(async (blobId: string) => {
    setLoading(true);
    try {
      // Check WCDN cache status
      const cacheStatus = await wcdnClient.getBlob(blobId);
      
      // Check blockchain status across all chains
      const blockchainStatus = await wcdnClient.getBlobMetadataFromChain(blobId);
      
      // Check blob availability on aggregators
      const multiChainStatus = await wcdnClient.getMultiChainBlobStatus(blobId);

      setStatus({
        cache: cacheStatus,
        blockchain: blockchainStatus,
        aggregators: multiChainStatus,
      });

      return {
        cache: cacheStatus,
        blockchain: blockchainStatus,
        aggregators: multiChainStatus,
      };
    } catch (error) {
      console.error('Failed to check blob status:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    checkMultiChainStatus,
    loading,
    status,
  };
}

// =============================================================================
// REACT COMPONENTS
// =============================================================================

export function MultiChainUploader() {
  const { uploadWithBlockchainRegistration, uploading, error } = useWCDNUpload();
  const [selectedChain, setSelectedChain] = useState<'ethereum' | 'sui' | 'solana'>('ethereum');
  const [registerOnChain, setRegisterOnChain] = useState(true);
  const [uploads, setUploads] = useState<any[]>([]);

  const handleFileUpload = async (files: FileList) => {
    try {
      const fileArray = Array.from(files);
      const results = await uploadWithBlockchainRegistration(fileArray, {
        chain: selectedChain,
        registerOnChain,
      });
      
      setUploads(prev => [...prev, ...results]);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Multi-Chain Blob Uploader</h2>
      
      {/* Chain Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Target Blockchain</label>
        <select 
          value={selectedChain} 
          onChange={(e) => setSelectedChain(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="ethereum">Ethereum</option>
          <option value="sui">Sui</option>
          <option value="solana">Solana (Coming Soon)</option>
        </select>
      </div>

      {/* Registration Option */}
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={registerOnChain}
            onChange={(e) => setRegisterOnChain(e.target.checked)}
            className="mr-2"
          />
          Register metadata on blockchain
        </label>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <input
          type="file"
          multiple
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {uploading && <p className="text-blue-600 mt-2">Uploading...</p>}
        {error && <p className="text-red-600 mt-2">{error}</p>}
      </div>

      {/* Upload Results */}
      {uploads.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Uploaded Files</h3>
          <div className="space-y-2">
            {uploads.map((upload, index) => (
              <div key={index} className="border rounded p-4">
                <p><strong>File:</strong> {upload.filename}</p>
                <p><strong>Blob ID:</strong> {upload.blob_id}</p>
                <p><strong>CDN URL:</strong> 
                  <a href={wcdnClient.getCDNUrl(upload.blob_id)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                    {wcdnClient.getCDNUrl(upload.blob_id)}
                  </a>
                </p>
                <p><strong>Size:</strong> {(upload.size / 1024).toFixed(2)} KB</p>
                <p><strong>Status:</strong> {upload.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BlobStatusChecker() {
  const { checkMultiChainStatus, loading, status } = useWCDNBlobStatus();
  const [blobId, setBlobId] = useState('');

  const handleCheck = async () => {
    if (!blobId.trim()) return;
    await checkMultiChainStatus(blobId.trim());
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Blob Status Checker</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Blob ID</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={blobId}
            onChange={(e) => setBlobId(e.target.value)}
            placeholder="Enter blob ID to check status..."
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={handleCheck}
            disabled={loading || !blobId.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Status'}
          </button>
        </div>
      </div>

      {status && (
        <div className="space-y-6">
          {/* Cache Status */}
          <div className="border rounded p-4">
            <h3 className="text-lg font-semibold mb-3">WCDN Cache Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Cached:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${status.cache.cached ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {status.cache.cached ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-medium">Pinned:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${status.cache.pinned ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                  {status.cache.pinned ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-medium">Size:</span> {(status.cache.size / 1024).toFixed(2)} KB
              </div>
              <div>
                <span className="font-medium">Content Type:</span> {status.cache.content_type}
              </div>
            </div>
          </div>

          {/* Blockchain Status */}
          <div className="border rounded p-4">
            <h3 className="text-lg font-semibold mb-3">Blockchain Registration</h3>
            <div className="space-y-3">
              {Object.entries(status.blockchain).map(([chain, data]: [string, any]) => (
                <div key={chain} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium capitalize">{chain}</span>
                  {data ? (
                    <div className="text-sm">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded mr-2">Registered</span>
                      <span className="text-gray-600">by {data.uploader.slice(0, 8)}...</span>
                    </div>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">Not Registered</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Aggregator Status */}
          <div className="border rounded p-4">
            <h3 className="text-lg font-semibold mb-3">Multi-Chain Aggregator Status</h3>
            <div className="space-y-3">
              {Object.entries(status.aggregators.chains).map(([chain, data]: [string, any]) => (
                <div key={chain} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium capitalize">{chain}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-sm ${data.exists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {data.exists ? 'Available' : 'Not Found'}
                    </span>
                    {data.latency && (
                      <span className="text-sm text-gray-600">{data.latency}ms</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {status.aggregators.summary.bestChain && (
              <div className="mt-3 p-3 bg-blue-50 rounded">
                <span className="font-medium">Best Performance:</span> 
                <span className="ml-2 capitalize">{status.aggregators.summary.bestChain}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// API ROUTES (for Next.js API)
// =============================================================================

// pages/api/upload.ts
export async function uploadHandler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files, chain, registerOnChain } = req.body;
    
    // Upload to WCDN
    const uploads = await wcdnClient.createBatchUpload(files);
    
    // Optionally register on blockchain
    if (registerOnChain && chain) {
      const blobsToRegister = uploads.map(upload => ({
        blobId: upload.blob_id,
        size: upload.size,
        contentType: upload.content_type,
        cdnUrl: wcdnClient.getCDNUrl(upload.blob_id),
        contentHash: upload.blob_id,
      }));

      const txHash = await wcdnClient.registerBlobBatchOnChain(blobsToRegister, chain);
      
      return res.status(200).json({ 
        uploads, 
        blockchainTx: txHash,
        success: true 
      });
    }

    res.status(200).json({ uploads, success: true });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Upload failed',
      success: false 
    });
  }
}

// pages/api/blob-status/[blobId].ts
export async function blobStatusHandler(req: any, res: any) {
  const { blobId } = req.query;

  if (!blobId) {
    return res.status(400).json({ error: 'Blob ID is required' });
  }

  try {
    const [cacheStatus, blockchainStatus, aggregatorStatus] = await Promise.all([
      wcdnClient.getBlob(blobId),
      wcdnClient.getBlobMetadataFromChain(blobId),
      wcdnClient.getMultiChainBlobStatus(blobId),
    ]);

    res.status(200).json({
      cache: cacheStatus,
      blockchain: blockchainStatus,
      aggregators: aggregatorStatus,
      success: true,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Status check failed',
      success: false 
    });
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function getOptimizedCDNUrl(blobId: string, chain?: 'ethereum' | 'sui' | 'solana') {
  return wcdnClient.getMultiChainCDNUrl(blobId, { chain });
}

export async function uploadAndRegister(
  file: File, 
  chain: 'ethereum' | 'sui' | 'solana' = 'ethereum'
): Promise<{ upload: any; txHash?: string }> {
  // Upload to WCDN
  const upload = await wcdnClient.createUpload(file);
  
  // Register on blockchain
  const txHashes = await wcdnClient.registerBlobOnChain(
    upload.blob_id,
    {
      size: upload.size,
      contentType: upload.content_type,
      cdnUrl: wcdnClient.getCDNUrl(upload.blob_id),
      contentHash: upload.blob_id, // In practice, compute actual hash
    },
    chain
  );

  return {
    upload,
    txHash: txHashes[chain] || undefined,
  };
}

export async function verifyBlobIntegrity(blobId: string, expectedHash: string) {
  const supportedChains = wcdnClient.getSupportedChains();
  const results: Record<string, boolean> = {};

  for (const chain of supportedChains) {
    try {
      const isValid = await wcdnClient.verifyBlobHashOnChain(blobId, expectedHash, chain);
      results[chain] = isValid;
    } catch (error) {
      console.error(`Verification failed on ${chain}:`, error);
      results[chain] = false;
    }
  }

  return results;
}