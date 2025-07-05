import { useState } from 'react';
import { useWCDNStore } from '../store/wcdnStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Pin, PinOff, Clock, Activity, HardDrive, Globe, Download, Copy, ExternalLink, FileText, RefreshCw } from 'lucide-react';
import { formatBytes, formatNumber, formatPercentage, formatLatency, formatDate, truncateCID } from '../lib/utils';

export function CIDExplorer() {
  const [searchCID, setSearchCID] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetryTimer, setAutoRetryTimer] = useState<NodeJS.Timeout | null>(null);
  const { 
    cidInfo, 
    isLoading, 
    error, 
    fetchCIDStats, 
    pinCID, 
    unpinCID 
  } = useWCDNStore();

  const handleSearch = () => {
    if (searchCID.trim()) {
      setRetryCount(0);
      clearAutoRetry();
      fetchCIDStats(searchCID.trim());
    }
  };

  const handleRetry = () => {
    if (searchCID.trim()) {
      setRetryCount(prev => prev + 1);
      fetchCIDStats(searchCID.trim());
    }
  };

  const startAutoRetry = (delaySeconds: number = 5) => {
    clearAutoRetry();
    const timer = setTimeout(() => {
      handleRetry();
    }, delaySeconds * 1000);
    setAutoRetryTimer(timer);
  };

  const clearAutoRetry = () => {
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
    }
  };

  const isNotSyncedError = (errorMsg: string) => {
    return errorMsg.includes('BLOB_NOT_AVAILABLE_YET') || 
           errorMsg.includes('尚未同步') || 
           errorMsg.includes('not yet synced');
  };

  const handlePin = async () => {
    if (cidInfo?.cid) {
      await pinCID(cidInfo.cid);
    }
  };

  const handleUnpin = async () => {
    if (cidInfo?.cid) {
      await unpinCID(cidInfo.cid);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const getSourceDisplayName = (source?: string) => {
    switch (source) {
      case 'walrus': return 'Walrus Network';
      case 'ipfs': return 'IPFS Gateway';
      default: return 'Unknown';
    }
  };

  const getSourceColor = (source?: string) => {
    switch (source) {
      case 'walrus': return 'text-blue-600';
      case 'ipfs': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">CID Explorer</h1>
        <p className="text-sm sm:text-base text-gray-600">Search and manage individual content by CID</p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search CID</CardTitle>
          <CardDescription>Enter a Walrus CID to view its cache status and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Input
              placeholder="Enter CID (e.g., bafybeihabcxyz123...)"
              value={searchCID}
              onChange={(e) => setSearchCID(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading} className="w-full sm:w-auto">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="space-y-4">
            {isNotSyncedError(error) ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <p className="text-yellow-800 font-medium">資料尚未同步</p>
                </div>
                <p className="text-sm text-yellow-700">
                  此 blob 可能還未同步到 Walrus aggregator。這是正常現象，通常需要 1-2 分鐘完成同步。
                </p>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Button 
                    onClick={handleRetry}
                    disabled={isLoading}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    重試 {retryCount > 0 && `(${retryCount})`}
                  </Button>
                  {!autoRetryTimer && !isLoading && (
                    <Button 
                      onClick={() => startAutoRetry(10)}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      10秒後自動重試
                    </Button>
                  )}
                  {autoRetryTimer && (
                    <Button 
                      onClick={clearAutoRetry}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      取消自動重試
                    </Button>
                  )}
                </div>
                <div className="text-xs text-yellow-600 space-y-1">
                  <p>💡 <strong>建議：</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>等待 1-2 分鐘後重試</li>
                    <li>確認 blob ID 是否正確</li>
                    <li>檢查此內容是否剛上傳</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <p className="text-red-800 font-medium">錯誤: {error}</p>
                <div className="text-sm text-red-700 space-y-2">
                  <p className="font-medium">可能的原因：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>此 blob ID 不存在於 Walrus 網路</li>
                    <li>網路連線問題</li>
                    <li>Walrus aggregator 服務異常</li>
                  </ul>
                </div>
                <Button 
                  onClick={handleRetry}
                  disabled={isLoading}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  重試
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CID Information */}
      {cidInfo && !isLoading && (
        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">CID Information</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <CardDescription className="font-mono text-xs sm:text-sm break-all">
                      {cidInfo.cid}
                    </CardDescription>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(cidInfo.cid)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {cidInfo.pinned ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleUnpin}
                      disabled={isLoading}
                      className="w-full sm:w-auto"
                    >
                      <PinOff className="h-4 w-4 mr-2" />
                      Unpin
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePin}
                      disabled={isLoading}
                      className="w-full sm:w-auto"
                    >
                      <Pin className="h-4 w-4 mr-2" />
                      Pin
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Cache Status</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">
                    {cidInfo.cached ? 'Cached' : 'Not Cached'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cidInfo.pinned ? 'Pinned' : 'Not Pinned'}
                  </p>
                </div>
                
                {cidInfo.cacheDate && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Cache Date</span>
                    </div>
                    <div className="text-lg font-bold">
                      {formatDate(cidInfo.cacheDate)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      TTL: {cidInfo.ttl || 0}s
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Source</span>
                  </div>
                  <div className={`text-lg font-bold ${getSourceColor(cidInfo.source)}`}>
                    {getSourceDisplayName(cidInfo.source)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Content origin
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Actions</span>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`http://localhost:4500/cdn/${cidInfo.cid}`, '_blank')}
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Content
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`http://localhost:4500/cdn/${cidInfo.cid}`)}
                      className="w-full"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copySuccess ? 'Copied!' : 'Copy URL'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blob Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Blob Metadata</CardTitle>
              <CardDescription>Technical details about the content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Content Type</span>
                  </div>
                  <div className="text-lg font-bold">
                    {cidInfo.contentType || 'application/octet-stream'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    MIME type
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Size</span>
                  </div>
                  <div className="text-lg font-bold">
                    {formatBytes(cidInfo.size || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    File size
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Download className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Gateway Status</span>
                  </div>
                  <div className="text-lg font-bold">
                    {cidInfo.cached ? 'Available' : 'Not Cached'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    CDN availability
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          {cidInfo.stats && (
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>Request patterns and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-500">Total Requests</span>
                    <div className="text-xl sm:text-2xl font-bold">
                      {formatNumber(cidInfo.stats.requests)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-500">Hit Rate</span>
                    <div className="text-xl sm:text-2xl font-bold">
                      {formatPercentage(cidInfo.stats.hitRate)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cidInfo.stats.hits} hits, {cidInfo.stats.misses} misses
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-500">Avg Latency</span>
                    <div className="text-xl sm:text-2xl font-bold">
                      {formatLatency(cidInfo.stats.avgLatency)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-500">Total Size</span>
                    <div className="text-xl sm:text-2xl font-bold">
                      {formatBytes(cidInfo.stats.totalSize)}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-500">First Access</span>
                    <div className="text-base sm:text-lg font-semibold">
                      {formatDate(cidInfo.stats.firstAccess)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-gray-500">Last Access</span>
                    <div className="text-base sm:text-lg font-semibold">
                      {formatDate(cidInfo.stats.lastAccess)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Stats Message */}
          {!cidInfo.stats && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No usage statistics available for this CID.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Statistics will appear after the first request to this content.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}