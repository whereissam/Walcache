import { useState } from 'react'
import { useWalcacheStore } from '../store/walcacheStore'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  Upload,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Settings,
  Clock,
  Pin,
  Globe,
} from 'lucide-react'

export function CacheManager() {
  const [preloadCIDs, setPreloadCIDs] = useState('')
  const [configCID, setConfigCID] = useState('')
  const [ttlValue, setTtlValue] = useState('3600')
  const [ttlUnit, setTtlUnit] = useState('seconds')
  const [fallbackEnabled, setFallbackEnabled] = useState(true)
  const {
    isLoading,
    error,
    // v1 API methods
    preloadBlobs,
    clearCacheEntries,
    pinBlob,
    unpinBlob,
    fetchBlob,
    blobs,
    // Legacy methods for backward compatibility
    preloadCIDs: preloadCIDsAction,
    clearCache,
    pinCID,
    unpinCID,
    fetchCIDStats,
    cidInfo,
  } = useWalcacheStore()

  const handlePreload = async () => {
    const cids = preloadCIDs
      .split(/[\n,]/)
      .map((cid) => cid.trim())
      .filter((cid) => cid.length > 0)

    if (cids.length > 0) {
      try {
        // Use v1 API for preloading
        await preloadBlobs(cids)
        setPreloadCIDs('')
      } catch (error) {
        console.warn('v1 API preload failed, falling back to legacy API')
        await preloadCIDsAction(cids)
        setPreloadCIDs('')
      }
    }
  }

  const handleClearCache = async () => {
    if (
      window.confirm(
        'Are you sure you want to clear all cache? This action cannot be undone.',
      )
    ) {
      try {
        // Use v1 API for clearing cache
        await clearCacheEntries()
      } catch (error) {
        console.warn('v1 API clear failed, falling back to legacy API')
        await clearCache()
      }
    }
  }

  const handleConfigureCache = async () => {
    if (!configCID.trim()) return

    try {
      // Use v1 API to fetch blob info
      await fetchBlob(configCID.trim())
    } catch (error) {
      console.warn('v1 API fetch failed, falling back to legacy API')
      // Fallback to legacy CID stats
      await fetchCIDStats(configCID.trim())
    }
  }

  const handlePinToggle = async () => {
    if (!cidInfo?.cid) return

    try {
      // Use v1 API for pin/unpin operations
      if (cidInfo.pinned) {
        await unpinBlob(cidInfo.cid)
      } else {
        await pinBlob(cidInfo.cid)
      }
      
      // Refresh blob info using v1 API
      await fetchBlob(cidInfo.cid)
    } catch (error) {
      console.warn('v1 API pin/unpin failed, falling back to legacy API')
      // Fallback to legacy pin/unpin
      if (cidInfo.pinned) {
        await unpinCID(cidInfo.cid)
      } else {
        await pinCID(cidInfo.cid)
      }
      
      // Refresh the CID info
      await fetchCIDStats(cidInfo.cid)
    }
  }

  const getTTLInSeconds = () => {
    const value = parseInt(ttlValue)
    switch (ttlUnit) {
      case 'minutes':
        return value * 60
      case 'hours':
        return value * 3600
      case 'days':
        return value * 86400
      default:
        return value
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Cache Management
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Configure cache settings, TTL, pinning, and manage content
        </p>
      </div>

      {/* Cache Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Configuration</CardTitle>
          <CardDescription>
            Configure TTL, pinning, and fallback settings for specific CIDs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CID to Configure
              </label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Input
                  placeholder="Enter CID (e.g., bafybeihabcxyz123...)"
                  value={configCID}
                  onChange={(e) => setConfigCID(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleConfigureCache}
                  disabled={isLoading || !configCID.trim()}
                  className="w-full sm:w-auto"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Load CID
                </Button>
              </div>
            </div>

            {cidInfo && cidInfo.cid === configCID.trim() && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* TTL Configuration */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">TTL Settings</span>
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <Input
                        type="number"
                        placeholder="TTL Value"
                        value={ttlValue}
                        onChange={(e) => setTtlValue(e.target.value)}
                        className="flex-1"
                      />
                      <Select value={ttlUnit} onValueChange={setTtlUnit}>
                        <SelectTrigger className="w-full sm:w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seconds">Seconds</SelectItem>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-gray-500">
                      Current TTL: {cidInfo.ttl || 0} seconds (
                      {getTTLInSeconds()} seconds when applied)
                    </p>
                  </div>

                  {/* Pinning Configuration */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Pin className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">
                        Pinning Control
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div>
                        <p className="text-sm font-medium">
                          Pin Status: {cidInfo.pinned ? 'Pinned' : 'Not Pinned'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Pinned content won't be evicted from cache
                        </p>
                      </div>
                      <Button
                        variant={cidInfo.pinned ? 'destructive' : 'default'}
                        size="sm"
                        onClick={handlePinToggle}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                      >
                        {cidInfo.pinned ? (
                          <>
                            <Pin className="h-4 w-4 mr-2" />
                            Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="h-4 w-4 mr-2" />
                            Pin
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Fallback Configuration */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">
                      Fallback Gateway Settings
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        IPFS Fallback:{' '}
                        {fallbackEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Automatically fallback to IPFS when Walrus is
                        unavailable
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFallbackEnabled(!fallbackEnabled)}
                    >
                      {fallbackEnabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>

                {/* Current Status */}
                <div className="mt-4 p-3 bg-blue-50 rounded border">
                  <p className="text-sm font-medium text-blue-800">
                    Current Status
                  </p>
                  <div className="mt-1 text-xs text-blue-600 space-y-1">
                    <p>
                      • Cache Status: {cidInfo.cached ? 'Cached' : 'Not Cached'}
                    </p>
                    <p>
                      • Pin Status: {cidInfo.pinned ? 'Pinned' : 'Not Pinned'}
                    </p>
                    <p>• TTL: {cidInfo.ttl || 0} seconds</p>
                    {cidInfo.cacheDate && (
                      <p>
                        • Cached: {new Date(cidInfo.cacheDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preload Content */}
      <Card>
        <CardHeader>
          <CardTitle>Preload Content</CardTitle>
          <CardDescription>
            Preload multiple CIDs to cache them for faster access. Enter one CID
            per line or separate with commas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CIDs to Preload
              </label>
              <textarea
                className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Enter CIDs here...&#10;bafybeihabcxyz123...&#10;bafybeihabcxyz456...&#10;bafybeihabcxyz789..."
                value={preloadCIDs}
                onChange={(e) => setPreloadCIDs(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
              <Button
                onClick={handlePreload}
                disabled={isLoading || !preloadCIDs.trim()}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                Preload CIDs
              </Button>
              <span className="text-sm text-gray-500">
                {
                  preloadCIDs
                    .split(/[\n,]/)
                    .filter((cid) => cid.trim().length > 0).length
                }{' '}
                CIDs
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Actions</CardTitle>
          <CardDescription>
            Manage cache storage and perform bulk operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
              <Button
                variant="destructive"
                onClick={handleClearCache}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Cache
              </Button>
              <div className="flex-1 text-sm text-gray-600">
                <div className="flex items-start sm:items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 sm:mt-0 flex-shrink-0" />
                  <span>
                    This will remove all cached content including pinned items
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <Card>
          <CardContent className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Processing...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Preloading:</strong> Use preloading to cache frequently
              accessed content during off-peak hours. This improves response
              times for your users.
            </div>
            <div>
              <strong>Bulk Operations:</strong> You can preload up to 100 CIDs
              at once. Large batches may take some time to process.
            </div>
            <div>
              <strong>Cache Limits:</strong> The cache has size limits. Older,
              less frequently accessed content may be evicted to make room for
              new content.
            </div>
            <div>
              <strong>Pinning:</strong> Use the CID Explorer to pin important
              content that should never be evicted from cache.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
