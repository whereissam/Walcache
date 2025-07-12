import { useState, useEffect } from 'react'
import { useWalcacheStore } from '../store/walcacheStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  Play, 
  Copy, 
  Clock, 
  Database, 
  Upload, 
  BarChart3, 
  Settings, 
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Code
} from 'lucide-react'
import { ErrorHandler } from './ErrorHandler'

interface ApiResponse {
  data?: any
  error?: any
  loading: boolean
  timestamp?: number
  duration?: number
}

export function ApiShowcase() {
  const [selectedEndpoint, setSelectedEndpoint] = useState('listBlobs')
  const [testBlobId, setTestBlobId] = useState('')
  const [apiResponses, setApiResponses] = useState<Record<string, ApiResponse>>({})
  const [showRawResponse, setShowRawResponse] = useState(false)

  const {
    listBlobs,
    fetchBlob,
    createUpload,
    fetchGlobalAnalytics,
    fetchCacheStatistics,
    preloadBlobs,
    pinBlob,
    unpinBlob,
    clearCacheEntries,
    error,
    setError,
    isLoading
  } = useWalcacheStore()

  // Sample endpoints for demonstration
  const apiEndpoints = [
    {
      id: 'listBlobs',
      name: 'List Blobs',
      description: 'Get paginated list of blobs with filtering',
      method: 'GET',
      endpoint: '/v1/blobs',
      category: 'blobs',
      icon: <Database className="h-4 w-4" />,
      params: { limit: 5, cached: true }
    },
    {
      id: 'getBlob',
      name: 'Get Blob',
      description: 'Get detailed information about a specific blob',
      method: 'GET',
      endpoint: '/v1/blobs/{id}',
      category: 'blobs',
      icon: <Eye className="h-4 w-4" />,
      requiresInput: true
    },
    {
      id: 'pinBlob',
      name: 'Pin Blob',
      description: 'Pin a blob to prevent cache eviction',
      method: 'POST',
      endpoint: '/v1/blobs/{id}/pin',
      category: 'cache',
      icon: <Settings className="h-4 w-4" />,
      requiresInput: true
    },
    {
      id: 'globalAnalytics',
      name: 'Global Analytics',
      description: 'Get comprehensive CDN performance metrics',
      method: 'GET',
      endpoint: '/v1/analytics/global',
      category: 'analytics',
      icon: <BarChart3 className="h-4 w-4" />
    },
    {
      id: 'cacheStats',
      name: 'Cache Statistics',
      description: 'Get current cache status and performance',
      method: 'GET',
      endpoint: '/v1/cache/stats',
      category: 'cache',
      icon: <Database className="h-4 w-4" />
    },
    {
      id: 'preloadBlobs',
      name: 'Preload Blobs',
      description: 'Preload multiple blobs into cache',
      method: 'POST',
      endpoint: '/v1/cache/preload',
      category: 'cache',
      icon: <Zap className="h-4 w-4" />
    }
  ]

  const executeApiCall = async (endpointId: string) => {
    const startTime = Date.now()
    
    setApiResponses(prev => ({
      ...prev,
      [endpointId]: { loading: true }
    }))

    setError(null)

    try {
      let result: any
      
      switch (endpointId) {
        case 'listBlobs':
          result = await listBlobs({ limit: 5, cached: true })
          break
          
        case 'getBlob':
          if (!testBlobId) {
            throw new Error('Please enter a blob ID to test')
          }
          result = await fetchBlob(testBlobId)
          break
          
        case 'pinBlob':
          if (!testBlobId) {
            throw new Error('Please enter a blob ID to pin')
          }
          result = await pinBlob(testBlobId)
          break
          
        case 'globalAnalytics':
          await fetchGlobalAnalytics()
          result = { message: 'Global analytics fetched successfully' }
          break
          
        case 'cacheStats':
          await fetchCacheStatistics()
          result = { message: 'Cache statistics fetched successfully' }
          break
          
        case 'preloadBlobs':
          if (!testBlobId) {
            throw new Error('Please enter blob IDs (comma-separated) to preload')
          }
          const blobIds = testBlobId.split(',').map(id => id.trim()).filter(Boolean)
          await preloadBlobs(blobIds)
          result = { message: `Preloaded ${blobIds.length} blobs successfully` }
          break
          
        default:
          throw new Error('Unknown endpoint')
      }

      const duration = Date.now() - startTime
      
      setApiResponses(prev => ({
        ...prev,
        [endpointId]: {
          data: result,
          loading: false,
          timestamp: Date.now(),
          duration
        }
      }))

    } catch (error: any) {
      const duration = Date.now() - startTime
      
      setApiResponses(prev => ({
        ...prev,
        [endpointId]: {
          error: error,
          loading: false,
          timestamp: Date.now(),
          duration
        }
      }))
    }
  }

  const copyResponse = async (endpointId: string) => {
    const response = apiResponses[endpointId]
    if (response) {
      const text = JSON.stringify(response.data || response.error, null, 2)
      await navigator.clipboard.writeText(text)
    }
  }

  const selectedEndpointData = apiEndpoints.find(ep => ep.id === selectedEndpoint)
  const response = apiResponses[selectedEndpoint]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">API Showcase</h1>
        <p className="text-gray-600">
          Experience the power of WCDN's v1 API with live examples and real-time responses
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
            {/* API Endpoints */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  API Endpoints
                </CardTitle>
                <CardDescription>
                  Select an endpoint to test the v1 API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {apiEndpoints.map(endpoint => (
                  <Button
                    key={endpoint.id}
                    variant={selectedEndpoint === endpoint.id ? "default" : "outline"}
                    className="w-full justify-start h-auto p-3"
                    onClick={() => setSelectedEndpoint(endpoint.id)}
                  >
                    <div className="flex items-start gap-3 text-left">
                      {endpoint.icon}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{endpoint.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {endpoint.method}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {endpoint.description}
                        </p>
                        <code className="text-xs bg-muted px-1 rounded">
                          {endpoint.endpoint}
                        </code>
                      </div>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* API Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Test {selectedEndpointData?.name}</span>
                  {response?.loading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedEndpointData?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedEndpointData?.requiresInput && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {selectedEndpointData.id === 'preloadBlobs' 
                        ? 'Blob IDs (comma-separated)' 
                        : 'Blob ID'
                      }
                    </label>
                    <Input
                      placeholder={
                        selectedEndpointData.id === 'preloadBlobs'
                          ? 'blob_123, blob_456, blob_789'
                          : 'Enter blob ID...'
                      }
                      value={testBlobId}
                      onChange={(e) => setTestBlobId(e.target.value)}
                    />
                  </div>
                )}

                <Button 
                  onClick={() => executeApiCall(selectedEndpoint)}
                  disabled={response?.loading || isLoading}
                  className="w-full"
                >
                  {response?.loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Execute API Call
                    </>
                  )}
                </Button>

                {/* Response Display */}
                {response && !response.loading && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {response.error ? (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-700">Error</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-green-700">Success</span>
                          </>
                        )}
                        {response.duration && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {response.duration}ms
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRawResponse(!showRawResponse)}
                        >
                          <Code className="h-3 w-3 mr-1" />
                          {showRawResponse ? 'Pretty' : 'Raw'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyResponse(selectedEndpoint)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 max-h-96 overflow-auto">
                      <pre className="text-xs">
                        {showRawResponse
                          ? JSON.stringify(response.data || response.error, null, 2)
                          : JSON.stringify(response.data || response.error, null, 2)
                        }
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        {/* Performance Metrics Section */}
        <Card>
          <CardHeader>
            <CardTitle>API Performance Metrics</CardTitle>
            <CardDescription>
              Real-time performance data from your API calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(apiResponses).map(([endpoint, response]) => (
                <div key={endpoint} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold">
                    {response.duration ? `${response.duration}ms` : '-'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {apiEndpoints.find(ep => ep.id === endpoint)?.name}
                  </div>
                  <div className="mt-1">
                    {response.error ? (
                      <Badge variant="destructive" className="text-xs">Error</Badge>
                    ) : response.data ? (
                      <Badge variant="default" className="text-xs">Success</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Not tested</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Code Examples Section */}
        <Card>
          <CardHeader>
            <CardTitle>Code Examples</CardTitle>
            <CardDescription>
              Copy-paste ready code examples for integrating with WCDN v1 API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Initialize SDK Client</h4>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  <pre>{`import { WalrusCDNClient } from '@walcache/sdk'

const client = new WalrusCDNClient({
  baseUrl: 'https://your-cdn.com',
  apiKey: process.env.WCDN_API_KEY
})`}</pre>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">List Blobs with Pagination</h4>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  <pre>{`const blobs = await client.listBlobs({
  limit: 10,
  cached: true,
  starting_after: 'blob_123'
})

console.log(\`Found \${blobs.data.length} blobs\`)
console.log(\`Has more: \${blobs.has_more}\`)`}</pre>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Upload File</h4>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  <pre>{`const upload = await client.createUpload(file, {
  vault_id: 'vault_123',
  parent_id: 'folder_456'
})

const blob = await client.getBlob(upload.blob_id)
const cdnUrl = client.getCDNUrl(blob.cid)`}</pre>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Error Handling</h4>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  <pre>{`try {
  const blob = await client.getBlob('invalid-id')
} catch (error) {
  if (error instanceof WalrusCDNError) {
    console.log('Error type:', error.type)
    console.log('Error code:', error.code)
    console.log('HTTP status:', error.status)
  }
}`}</pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Global Error Handler */}
      {error && (
        <ErrorHandler
          error={error}
          onDismiss={() => setError(null)}
          showRetry={true}
          onRetry={() => {
            setError(null)
            if (selectedEndpoint) {
              executeApiCall(selectedEndpoint)
            }
          }}
        />
      )}
    </div>
  )
}