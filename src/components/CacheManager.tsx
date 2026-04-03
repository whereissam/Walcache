import { useState } from 'react'
import {
  AlertTriangle,
  Clock,
  Loader2,
  Pin,
  Trash2,
  Upload,
} from 'lucide-react'
import { useWalcacheStore } from '../store/walcacheStore'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

export function CacheManager() {
  const [preloadCIDs, setPreloadCIDs] = useState('')
  const [configCID, setConfigCID] = useState('')
  const [ttlValue, setTtlValue] = useState('3600')
  const [ttlUnit, setTtlUnit] = useState('seconds')
  const {
    isLoading,
    error,
    preloadBlobs,
    clearCacheEntries,
    pinBlob,
    unpinBlob,
    fetchCIDStats,
    cidInfo,
  } = useWalcacheStore()

  const handlePreload = async () => {
    const cids = preloadCIDs
      .split(/[\n,]/)
      .map((cid) => cid.trim())
      .filter((cid) => cid.length > 0)
    if (cids.length === 0) return
    await preloadBlobs(cids)
    setPreloadCIDs('')
  }

  const handleClearCache = async () => {
    if (!window.confirm('Clear all cached content? This cannot be undone.'))
      return
    await clearCacheEntries()
  }

  const handleLoadCID = async () => {
    if (!configCID.trim()) return
    await fetchCIDStats(configCID.trim())
  }

  const handlePinToggle = async () => {
    if (!cidInfo?.cid) return
    if (cidInfo.pinned) {
      await unpinBlob(cidInfo.cid)
    } else {
      await pinBlob(cidInfo.cid)
    }
    // Refresh to show updated pin state
    await fetchCIDStats(cidInfo.cid)
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

  const cidCount = preloadCIDs
    .split(/[\n,]/)
    .filter((cid) => cid.trim().length > 0).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cache</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Configure caching, preload content, and manage pinned blobs.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5">
          <p className="text-[13px] text-destructive">
            {typeof error === 'string' ? error : error.message}
          </p>
        </div>
      )}

      {/* Configure CID */}
      <section className="space-y-3">
        <h2 className="text-[14px] font-semibold text-foreground">
          Configure blob
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="Enter blob ID to configure..."
            value={configCID}
            onChange={(e) => setConfigCID(e.target.value)}
            className="h-9 text-[14px] font-mono flex-1"
          />
          <Button
            onClick={handleLoadCID}
            disabled={isLoading || !configCID.trim()}
            className="h-9 text-[13px]"
          >
            Load
          </Button>
        </div>

        {cidInfo && cidInfo.cid === configCID.trim() && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* TTL */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  TTL settings
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={ttlValue}
                    onChange={(e) => setTtlValue(e.target.value)}
                    className="h-8 text-[13px] flex-1"
                  />
                  <Select value={ttlUnit} onValueChange={setTtlUnit}>
                    <SelectTrigger className="w-24 h-8 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">sec</SelectItem>
                      <SelectItem value="minutes">min</SelectItem>
                      <SelectItem value="hours">hr</SelectItem>
                      <SelectItem value="days">day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Current: {cidInfo.ttl || 0}s | New: {getTTLInSeconds()}s
                </p>
              </div>

              {/* Pin control */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                  <Pin className="h-3.5 w-3.5 text-chart-4" />
                  Pin control
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-foreground">
                      {cidInfo.pinned ? 'Pinned' : 'Not pinned'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Pinned content won't be evicted
                    </p>
                  </div>
                  <Button
                    variant={cidInfo.pinned ? 'destructive' : 'default'}
                    size="sm"
                    onClick={handlePinToggle}
                    disabled={isLoading}
                    className="h-7 text-[12px]"
                  >
                    {cidInfo.pinned ? 'Unpin' : 'Pin'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Status summary */}
            <div className="flex items-center gap-4 pt-2 border-t border-border text-[12px] text-muted-foreground">
              <span>Cache: {cidInfo.cached ? 'yes' : 'no'}</span>
              <span>Pin: {cidInfo.pinned ? 'yes' : 'no'}</span>
              <span>TTL: {cidInfo.ttl || 0}s</span>
              {cidInfo.cacheDate && (
                <span>
                  Since: {new Date(cidInfo.cacheDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Preload */}
      <section className="space-y-3">
        <h2 className="text-[14px] font-semibold text-foreground">
          Preload content
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Warm the cache with blob IDs. One per line or comma-separated.
        </p>
        <textarea
          className="w-full h-28 p-3 rounded-lg border border-border bg-card text-[13px] font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
          placeholder="blob_id_1&#10;blob_id_2&#10;blob_id_3"
          value={preloadCIDs}
          onChange={(e) => setPreloadCIDs(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePreload}
            disabled={isLoading || cidCount === 0}
            className="h-8 text-[13px]"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1.5" />
            )}
            Preload
          </Button>
          <span className="text-[12px] text-muted-foreground tabular-nums">
            {cidCount} blob{cidCount !== 1 ? 's' : ''}
          </span>
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-3">
        <h2 className="text-[14px] font-semibold text-foreground">
          Danger zone
        </h2>
        <div className="rounded-lg border border-destructive/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-medium text-foreground">
                Clear all cache
              </p>
              <p className="text-[12px] text-muted-foreground">
                Removes all cached content including pinned items.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={handleClearCache}
            disabled={isLoading}
            className="h-8 text-[12px] shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear cache
          </Button>
        </div>
      </section>
    </div>
  )
}
