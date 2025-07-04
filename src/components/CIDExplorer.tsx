import { useState } from 'react';
import { useWCDNStore } from '../store/wcdnStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Pin, PinOff, Clock, Activity, HardDrive } from 'lucide-react';
import { formatBytes, formatNumber, formatPercentage, formatLatency, formatDate, truncateCID } from '../lib/utils';

export function CIDExplorer() {
  const [searchCID, setSearchCID] = useState('');
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
      fetchCIDStats(searchCID.trim());
    }
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
          <CardContent className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
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
                  <CardDescription className="font-mono text-xs sm:text-sm break-all">
                    {cidInfo.cid}
                  </CardDescription>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                    <div className="text-xl sm:text-2xl font-bold">
                      {formatDate(cidInfo.cacheDate)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      TTL: {cidInfo.ttl || 0}s
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Quick Access</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold">
                    <a 
                      href={`http://localhost:4500/cdn/${cidInfo.cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      View Content
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Open in new tab
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