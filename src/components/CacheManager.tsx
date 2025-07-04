import { useState } from 'react';
import { useWCDNStore } from '../store/wcdnStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Upload, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

export function CacheManager() {
  const [preloadCIDs, setPreloadCIDs] = useState('');
  const { isLoading, error, preloadCIDs: preloadCIDsAction, clearCache } = useWCDNStore();

  const handlePreload = async () => {
    const cids = preloadCIDs
      .split(/[\n,]/)
      .map(cid => cid.trim())
      .filter(cid => cid.length > 0);

    if (cids.length > 0) {
      await preloadCIDsAction(cids);
      setPreloadCIDs('');
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear all cache? This action cannot be undone.')) {
      await clearCache();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Cache Management</h1>
        <p className="text-sm sm:text-base text-gray-600">Preload content and manage cache settings</p>
      </div>

      {/* Preload Content */}
      <Card>
        <CardHeader>
          <CardTitle>Preload Content</CardTitle>
          <CardDescription>
            Preload multiple CIDs to cache them for faster access. Enter one CID per line or separate with commas.
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
                {preloadCIDs.split(/[\n,]/).filter(cid => cid.trim().length > 0).length} CIDs
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
                  <span>This will remove all cached content including pinned items</span>
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
              <strong>Preloading:</strong> Use preloading to cache frequently accessed content during off-peak hours. This improves response times for your users.
            </div>
            <div>
              <strong>Bulk Operations:</strong> You can preload up to 100 CIDs at once. Large batches may take some time to process.
            </div>
            <div>
              <strong>Cache Limits:</strong> The cache has size limits. Older, less frequently accessed content may be evicted to make room for new content.
            </div>
            <div>
              <strong>Pinning:</strong> Use the CID Explorer to pin important content that should never be evicted from cache.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}