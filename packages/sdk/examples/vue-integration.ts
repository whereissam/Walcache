/**
 * Vue.js Integration Example for WCDN SDK
 * Demonstrates blockchain integration with Vue 3 Composition API
 */

import { ref, computed, reactive, onMounted } from 'vue';
import { WalrusCDNClient } from '@wcdn/sdk';
import { PRESET_CONFIGS } from '@wcdn/sdk/blockchain';

// =============================================================================
// CLIENT SETUP
// =============================================================================

const wcdnClient = new WalrusCDNClient(
  {
    baseUrl: process.env.VUE_APP_WCDN_BASE_URL || 'https://your-wcdn-instance.com',
    apiKey: process.env.VUE_APP_WCDN_API_KEY,
  },
  {
    ethereum: PRESET_CONFIGS.ethereum.mainnet(
      process.env.VUE_APP_ETHEREUM_CONTRACT_ADDRESS || '',
      process.env.VUE_APP_ETHEREUM_PRIVATE_KEY
    ),
    sui: PRESET_CONFIGS.sui.mainnet(
      process.env.VUE_APP_SUI_PACKAGE_ID || '',
      process.env.VUE_APP_SUI_PRIVATE_KEY
    ),
  }
);

// =============================================================================
// COMPOSABLES
// =============================================================================

export function useWCDNUpload() {
  const uploading = ref(false);
  const progress = ref<Record<string, number>>({});
  const error = ref<string | null>(null);
  const uploads = ref<any[]>([]);

  const uploadFiles = async (
    files: File[],
    options: {
      chain?: 'ethereum' | 'sui' | 'solana';
      vaultId?: string;
      registerOnChain?: boolean;
    } = {}
  ) => {
    uploading.value = true;
    error.value = null;

    try {
      // Upload files in batch
      const results = await wcdnClient.createBatchUpload(files, {
        vault_id: options.vaultId,
      });

      // Register on blockchain if requested
      if (options.registerOnChain && options.chain) {
        const blobsToRegister = results.map(upload => ({
          blobId: upload.blob_id,
          size: upload.size,
          contentType: upload.content_type,
          cdnUrl: wcdnClient.getCDNUrl(upload.blob_id),
          contentHash: upload.blob_id,
        }));

        const txHash = await wcdnClient.registerBlobBatchOnChain(blobsToRegister, options.chain);
        console.log('Blockchain registration:', txHash);
      }

      uploads.value.push(...results);
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      error.value = message;
      throw new Error(message);
    } finally {
      uploading.value = false;
    }
  };

  const clearUploads = () => {
    uploads.value = [];
    error.value = null;
  };

  return {
    uploading: readonly(uploading),
    progress: readonly(progress),
    error: readonly(error),
    uploads: readonly(uploads),
    uploadFiles,
    clearUploads,
  };
}

export function useWCDNBlobQuery() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const cache = ref(new Map<string, any>());

  const getBlob = async (blobId: string, useCache = true) => {
    if (useCache && cache.value.has(blobId)) {
      return cache.value.get(blobId);
    }

    loading.value = true;
    error.value = null;

    try {
      const blob = await wcdnClient.getBlob(blobId);
      cache.value.set(blobId, blob);
      return blob;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch blob';
      error.value = message;
      throw new Error(message);
    } finally {
      loading.value = false;
    }
  };

  const getBlobsBatch = async (blobIds: string[]) => {
    loading.value = true;
    error.value = null;

    try {
      const blobs = await wcdnClient.getBlobsBatch(blobIds);
      
      // Update cache
      blobs.forEach((blob, index) => {
        if (blob) {
          cache.value.set(blobIds[index], blob);
        }
      });

      return blobs;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch blobs';
      error.value = message;
      throw new Error(message);
    } finally {
      loading.value = false;
    }
  };

  const checkMultiChainStatus = async (blobId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const [cacheStatus, blockchainStatus, aggregatorStatus] = await Promise.all([
        wcdnClient.getBlob(blobId),
        wcdnClient.getBlobMetadataFromChain(blobId),
        wcdnClient.getMultiChainBlobStatus(blobId),
      ]);

      return {
        cache: cacheStatus,
        blockchain: blockchainStatus,
        aggregators: aggregatorStatus,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check blob status';
      error.value = message;
      throw new Error(message);
    } finally {
      loading.value = false;
    }
  };

  const clearCache = () => {
    cache.value.clear();
  };

  return {
    loading: readonly(loading),
    error: readonly(error),
    getBlob,
    getBlobsBatch,
    checkMultiChainStatus,
    clearCache,
  };
}

export function useWCDNAnalytics() {
  const analytics = reactive({
    global: null as any,
    blobStats: new Map<string, any>(),
    cacheStats: null as any,
  });

  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchGlobalAnalytics = async () => {
    loading.value = true;
    error.value = null;

    try {
      analytics.global = await wcdnClient.getGlobalAnalytics();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
      error.value = message;
    } finally {
      loading.value = false;
    }
  };

  const fetchBlobAnalytics = async (blobId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const stats = await wcdnClient.getBlobAnalytics(blobId);
      analytics.blobStats.set(blobId, stats);
      return stats;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch blob analytics';
      error.value = message;
    } finally {
      loading.value = false;
    }
  };

  const fetchCacheStats = async () => {
    loading.value = true;
    error.value = null;

    try {
      analytics.cacheStats = await wcdnClient.getCacheStats();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch cache stats';
      error.value = message;
    } finally {
      loading.value = false;
    }
  };

  return {
    analytics,
    loading: readonly(loading),
    error: readonly(error),
    fetchGlobalAnalytics,
    fetchBlobAnalytics,
    fetchCacheStats,
  };
}

// =============================================================================
// VUE COMPONENTS (in SFC style)
// =============================================================================

export const MultiChainUploader = {
  setup() {
    const { uploading, error, uploads, uploadFiles, clearUploads } = useWCDNUpload();
    
    const selectedChain = ref<'ethereum' | 'sui' | 'solana'>('ethereum');
    const registerOnChain = ref(true);
    const files = ref<File[]>([]);

    const handleFileChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files) {
        files.value = Array.from(target.files);
      }
    };

    const handleUpload = async () => {
      if (files.value.length === 0) return;

      try {
        await uploadFiles(files.value, {
          chain: selectedChain.value,
          registerOnChain: registerOnChain.value,
        });
        files.value = [];
      } catch (err) {
        console.error('Upload failed:', err);
      }
    };

    const getCDNUrl = (blobId: string) => {
      return wcdnClient.getCDNUrl(blobId);
    };

    return {
      uploading,
      error,
      uploads,
      selectedChain,
      registerOnChain,
      files,
      handleFileChange,
      handleUpload,
      clearUploads,
      getCDNUrl,
    };
  },

  template: `
    <div class="max-w-4xl mx-auto p-6">
      <h2 class="text-2xl font-bold mb-6">Multi-Chain File Uploader</h2>
      
      <!-- Configuration -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label class="block text-sm font-medium mb-2">Target Blockchain</label>
          <select v-model="selectedChain" class="w-full border rounded px-3 py-2">
            <option value="ethereum">Ethereum</option>
            <option value="sui">Sui</option>
            <option value="solana">Solana (Coming Soon)</option>
          </select>
        </div>
        
        <div class="flex items-center">
          <label class="flex items-center">
            <input
              type="checkbox"
              v-model="registerOnChain"
              class="mr-2"
            />
            Register on blockchain
          </label>
        </div>
      </div>

      <!-- File Upload -->
      <div class="mb-6">
        <input
          type="file"
          multiple
          @change="handleFileChange"
          class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        
        <div class="mt-4 flex gap-2">
          <button
            @click="handleUpload"
            :disabled="files.length === 0 || uploading"
            class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {{ uploading ? 'Uploading...' : 'Upload Files' }}
          </button>
          
          <button
            @click="clearUploads"
            class="px-4 py-2 bg-gray-600 text-white rounded"
          >
            Clear Results
          </button>
        </div>

        <div v-if="error" class="mt-2 text-red-600">{{ error }}</div>
      </div>

      <!-- Upload Results -->
      <div v-if="uploads.length > 0" class="space-y-4">
        <h3 class="text-lg font-semibold">Uploaded Files</h3>
        
        <div
          v-for="(upload, index) in uploads"
          :key="index"
          class="border rounded p-4"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div><strong>File:</strong> {{ upload.filename }}</div>
            <div><strong>Size:</strong> {{ (upload.size / 1024).toFixed(2) }} KB</div>
            <div><strong>Blob ID:</strong> {{ upload.blob_id }}</div>
            <div><strong>Status:</strong> {{ upload.status }}</div>
          </div>
          
          <div class="mt-2">
            <strong>CDN URL:</strong>
            <a
              :href="getCDNUrl(upload.blob_id)"
              target="_blank"
              class="text-blue-600 hover:underline ml-1"
            >
              {{ getCDNUrl(upload.blob_id) }}
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
};

export const BlobStatusDashboard = {
  setup() {
    const { checkMultiChainStatus, loading } = useWCDNBlobQuery();
    const { analytics, fetchGlobalAnalytics, fetchCacheStats } = useWCDNAnalytics();
    
    const blobId = ref('');
    const blobStatus = ref<any>(null);
    const searchHistory = ref<string[]>([]);

    const handleStatusCheck = async () => {
      if (!blobId.value.trim()) return;

      try {
        blobStatus.value = await checkMultiChainStatus(blobId.value.trim());
        
        // Add to search history
        if (!searchHistory.value.includes(blobId.value.trim())) {
          searchHistory.value.unshift(blobId.value.trim());
          if (searchHistory.value.length > 10) {
            searchHistory.value = searchHistory.value.slice(0, 10);
          }
        }
      } catch (err) {
        console.error('Status check failed:', err);
      }
    };

    const selectFromHistory = (id: string) => {
      blobId.value = id;
      handleStatusCheck();
    };

    onMounted(() => {
      fetchGlobalAnalytics();
      fetchCacheStats();
    });

    return {
      blobId,
      blobStatus,
      searchHistory,
      loading,
      analytics,
      handleStatusCheck,
      selectFromHistory,
    };
  },

  template: `
    <div class="max-w-6xl mx-auto p-6">
      <h2 class="text-2xl font-bold mb-6">Blob Status Dashboard</h2>
      
      <!-- Search -->
      <div class="mb-6">
        <div class="flex gap-2">
          <input
            v-model="blobId"
            type="text"
            placeholder="Enter blob ID to check status..."
            class="flex-1 border rounded px-3 py-2"
            @keypress.enter="handleStatusCheck"
          />
          <button
            @click="handleStatusCheck"
            :disabled="loading || !blobId.trim()"
            class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {{ loading ? 'Checking...' : 'Check Status' }}
          </button>
        </div>
        
        <!-- Search History -->
        <div v-if="searchHistory.length > 0" class="mt-2">
          <div class="text-sm text-gray-600 mb-1">Recent searches:</div>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="id in searchHistory"
              :key="id"
              @click="selectFromHistory(id)"
              class="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
            >
              {{ id.slice(0, 12) }}...
            </button>
          </div>
        </div>
      </div>

      <!-- Global Stats -->
      <div v-if="analytics.global" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-blue-50 p-4 rounded">
          <div class="text-2xl font-bold text-blue-600">
            {{ analytics.global.global.total_requests.toLocaleString() }}
          </div>
          <div class="text-sm text-gray-600">Total Requests</div>
        </div>
        
        <div class="bg-green-50 p-4 rounded">
          <div class="text-2xl font-bold text-green-600">
            {{ (analytics.global.global.cache_hits / analytics.global.global.total_requests * 100).toFixed(1) }}%
          </div>
          <div class="text-sm text-gray-600">Cache Hit Rate</div>
        </div>
        
        <div class="bg-purple-50 p-4 rounded">
          <div class="text-2xl font-bold text-purple-600">
            {{ analytics.global.global.unique_cids.toLocaleString() }}
          </div>
          <div class="text-sm text-gray-600">Unique Blobs</div>
        </div>
      </div>

      <!-- Blob Status Results -->
      <div v-if="blobStatus" class="space-y-6">
        <!-- Cache Status -->
        <div class="border rounded p-4">
          <h3 class="text-lg font-semibold mb-3">WCDN Cache Status</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span class="font-medium">Cached:</span>
              <span 
                :class="[
                  'ml-2 px-2 py-1 rounded text-sm',
                  blobStatus.cache.cached 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                ]"
              >
                {{ blobStatus.cache.cached ? 'Yes' : 'No' }}
              </span>
            </div>
            
            <div>
              <span class="font-medium">Pinned:</span>
              <span 
                :class="[
                  'ml-2 px-2 py-1 rounded text-sm',
                  blobStatus.cache.pinned 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                ]"
              >
                {{ blobStatus.cache.pinned ? 'Yes' : 'No' }}
              </span>
            </div>
            
            <div>
              <span class="font-medium">Size:</span>
              {{ (blobStatus.cache.size / 1024).toFixed(2) }} KB
            </div>
            
            <div>
              <span class="font-medium">Type:</span>
              {{ blobStatus.cache.content_type }}
            </div>
          </div>
        </div>

        <!-- Blockchain Status -->
        <div class="border rounded p-4">
          <h3 class="text-lg font-semibold mb-3">Blockchain Registration</h3>
          <div class="space-y-2">
            <div
              v-for="(data, chain) in blobStatus.blockchain"
              :key="chain"
              class="flex items-center justify-between p-3 bg-gray-50 rounded"
            >
              <span class="font-medium capitalize">{{ chain }}</span>
              <div v-if="data" class="text-sm">
                <span class="bg-green-100 text-green-800 px-2 py-1 rounded mr-2">
                  Registered
                </span>
                <span class="text-gray-600">
                  by {{ data.uploader.slice(0, 8) }}...
                </span>
              </div>
              <span v-else class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                Not Registered
              </span>
            </div>
          </div>
        </div>

        <!-- Aggregator Status -->
        <div class="border rounded p-4">
          <h3 class="text-lg font-semibold mb-3">Multi-Chain Aggregator Status</h3>
          <div class="space-y-2">
            <div
              v-for="(data, chain) in blobStatus.aggregators.chains"
              :key="chain"
              class="flex items-center justify-between p-3 bg-gray-50 rounded"
            >
              <span class="font-medium capitalize">{{ chain }}</span>
              <div class="flex items-center gap-2">
                <span 
                  :class="[
                    'px-2 py-1 rounded text-sm',
                    data.exists 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ data.exists ? 'Available' : 'Not Found' }}
                </span>
                <span v-if="data.latency" class="text-sm text-gray-600">
                  {{ data.latency }}ms
                </span>
              </div>
            </div>
          </div>
          
          <div
            v-if="blobStatus.aggregators.summary.bestChain"
            class="mt-3 p-3 bg-blue-50 rounded"
          >
            <span class="font-medium">Best Performance:</span>
            <span class="ml-2 capitalize">
              {{ blobStatus.aggregators.summary.bestChain }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
};

// =============================================================================
// PLUGIN SETUP
// =============================================================================

export default {
  install(app: any, options: { wcdnConfig?: any; blockchainConfig?: any } = {}) {
    // Make WCDN client available globally
    app.config.globalProperties.$wcdn = wcdnClient;
    
    // Provide composables
    app.provide('wcdnClient', wcdnClient);
    
    // Register components globally if needed
    app.component('MultiChainUploader', MultiChainUploader);
    app.component('BlobStatusDashboard', BlobStatusDashboard);
  },
};