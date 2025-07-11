import React, { useState } from 'react'
import { Info, Search, ExternalLink } from 'lucide-react'
import { useWalcache } from '../contexts/WalcacheContext'
import ResultCard from '../components/ResultCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function AssetInfo() {
  const { getAssetInfo, loading } = useWalcache()
  const [assetId, setAssetId] = useState('bafkreihvzun3vxd2dxqhvhwdvwyx7vt7zwqhvhwdvwyx7vt7zwqhvhw')
  const [result, setResult] = useState<any>(null)

  const handleSearch = async () => {
    if (!assetId.trim()) return
    
    const response = await getAssetInfo(assetId.trim())
    setResult(response)
  }

  const formatLatency = (latency?: number) => {
    return latency ? `${latency}ms` : 'N/A'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Info className="w-6 h-6" />
          Asset Information Lookup
        </h2>

        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset ID (Blob ID)
            </label>
            <input
              type="text"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="Enter blob ID (e.g., bafkreih...)"
              className="input-field"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={!assetId.trim() || loading}
              className="btn-primary"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Get Info
                </>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="space-y-4">
            {result.success ? (
              <ResultCard type="success" title="Asset Information">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Asset ID:</strong>{' '}
                        <code className="bg-white px-2 py-1 rounded text-xs break-all">
                          {result.data.id}
                        </code>
                      </p>
                      <p>
                        <strong>Cached:</strong>{' '}
                        <span className={result.data.cached ? 'text-green-600' : 'text-red-600'}>
                          {result.data.cached ? '✅ Yes' : '❌ No'}
                        </span>
                      </p>
                      <p>
                        <strong>Pinned:</strong>{' '}
                        <span className={result.data.pinned ? 'text-green-600' : 'text-gray-600'}>
                          {result.data.pinned ? '✅ Yes' : '❌ No'}
                        </span>
                      </p>
                      <p>
                        <strong>CDN URL:</strong>{' '}
                        <a 
                          href={result.data.cdnUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          View Asset <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    </div>
                  </div>

                  {/* Performance Stats */}
                  {result.data.stats && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800">Performance Stats</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-primary-600">
                            {result.data.stats.requests.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">Requests</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-green-600">
                            {result.data.stats.hitRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-600">Hit Rate</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-blue-600">
                            {result.data.stats.avgLatency}ms
                          </div>
                          <div className="text-xs text-gray-600">Avg Latency</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Multi-Chain Status */}
                {result.data.multiChain && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-800 mb-3">Multi-Chain Availability</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      {Object.entries(result.data.multiChain.chains).map(([chain, status]: [string, any]) => (
                        <div key={chain} className="p-4 bg-white rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-800 capitalize">{chain}</span>
                            <span className={`text-sm font-medium ${status.exists ? 'text-green-600' : 'text-red-600'}`}>
                              {status.exists ? '✅ Available' : '❌ Not Found'}
                            </span>
                          </div>
                          {status.latency && (
                            <p className="text-sm text-gray-600">
                              Latency: {formatLatency(status.latency)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ResultCard>
            ) : (
              <ResultCard type="error" title="Asset Not Found">
                <p>{result.error}</p>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 Tips:</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
                    <li>Make sure the blob ID is correct and complete</li>
                    <li>Try uploading a file first using the Upload page</li>
                    <li>Check if your backend server is running</li>
                  </ul>
                </div>
              </ResultCard>
            )}
          </div>
        )}
      </div>

      {/* Sample Data */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">📋 Sample Asset IDs</h3>
        <div className="space-y-2">
          <button
            onClick={() => setAssetId('bafkreihvzun3vxd2dxqhvhwdvwyx7vt7zwqhvhwdvwyx7vt7zwqhvhw')}
            className="block w-full text-left p-3 bg-white rounded border hover:bg-blue-50 transition-colors"
          >
            <code className="text-sm text-blue-700">bafkreihvzun3vxd2dxqhvhwdvwyx7vt7zwqhvhwdvwyx7vt7zwqhvhw</code>
            <p className="text-xs text-gray-600 mt-1">Sample Asset #1</p>
          </button>
          <button
            onClick={() => setAssetId('bafkreig6mzqvqsqqrwf6gw7qo7yklqng7ez2lxsb5vmvcwgbumz5qcpqxy')}
            className="block w-full text-left p-3 bg-white rounded border hover:bg-blue-50 transition-colors"
          >
            <code className="text-sm text-blue-700">bafkreig6mzqvqsqqrwf6gw7qo7yklqng7ez2lxsb5vmvcwgbumz5qcpqxy</code>
            <p className="text-xs text-gray-600 mt-1">Sample Asset #2</p>
          </button>
        </div>
        <p className="text-sm text-blue-700 mt-4">
          Click on any sample ID above to auto-fill the search field, or paste your own blob ID.
        </p>
      </div>

      {/* Information */}
      <div className="card p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">ℹ️ About Asset Information</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            The Asset Information lookup provides comprehensive details about files stored in your Walcache system:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Caching Status:</strong> Whether the asset is cached for fast delivery</li>
            <li><strong>Pin Status:</strong> If the asset is pinned to prevent eviction</li>
            <li><strong>Performance Metrics:</strong> Request count, hit rate, and latency statistics</li>
            <li><strong>Multi-Chain Availability:</strong> Which blockchains have this asset available</li>
          </ul>
        </div>
      </div>
    </div>
  )
}