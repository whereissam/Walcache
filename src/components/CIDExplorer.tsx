import { useState } from 'react'
import { WALCACHE_BASE_URL } from '@/config/env'
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  Pin,
  PinOff,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useWalcacheStore } from '../store/walcacheStore'
import {
  formatBytes,
  formatDate,
  formatLatency,
  formatNumber,
  formatPercentage,
} from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'

export function CIDExplorer() {
  const [searchCID, setSearchCID] = useState('')
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const {
    cidInfo,
    isLoading,
    error: rawError,
    fetchCIDStats,
    pinCID,
    unpinCID,
  } = useWalcacheStore()
  const error = rawError
    ? typeof rawError === 'string'
      ? rawError
      : rawError.message
    : null

  const handleSearch = () => {
    if (searchCID.trim()) {
      setRetryCount(0)
      fetchCIDStats(searchCID.trim())
    }
  }

  const handleRetry = () => {
    if (searchCID.trim()) {
      setRetryCount((prev) => prev + 1)
      fetchCIDStats(searchCID.trim())
    }
  }

  const isNotSyncedError = (errorMsg: string) =>
    errorMsg.includes('BLOB_NOT_AVAILABLE_YET') ||
    errorMsg.includes('not yet synced')

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(key)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch {
      // Clipboard unavailable
    }
  }

  const getSourceLabel = (source?: string, cid?: string) => {
    if (source === 'walrus') return 'Walrus'
    if (source === 'ipfs') return 'IPFS'
    if (cid?.startsWith('bafkrei') || cid?.startsWith('Qm'))
      return 'IPFS/Walrus'
    return 'Unknown'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Explorer</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Look up any blob by CID to inspect cache status and analytics.
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Enter blob ID or CID..."
          value={searchCID}
          onChange={(e) => setSearchCID(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="h-9 text-[14px] font-mono flex-1"
        />
        <Button
          onClick={handleSearch}
          disabled={isLoading || !searchCID.trim()}
          className="h-9 px-4 text-[13px]"
        >
          <Search className="h-3.5 w-3.5 mr-1.5" />
          Search
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div
          className={`rounded-lg border px-4 py-3 ${
            isNotSyncedError(error)
              ? 'border-chart-2/30 bg-chart-2/5'
              : 'border-destructive/20 bg-destructive/5'
          }`}
        >
          <div className="flex items-start gap-3">
            <Clock
              className={`h-4 w-4 mt-0.5 ${isNotSyncedError(error) ? 'text-chart-2' : 'text-destructive'}`}
            />
            <div className="flex-1 space-y-2">
              <p
                className={`text-[13px] font-medium ${isNotSyncedError(error) ? 'text-chart-2' : 'text-destructive'}`}
              >
                {isNotSyncedError(error)
                  ? 'Blob not synced yet — this usually takes 1-2 minutes after upload.'
                  : error}
              </p>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="h-7 text-[12px]"
              >
                <RefreshCw
                  className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`}
                />
                Retry {retryCount > 0 && `(${retryCount})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {cidInfo && !isLoading && (
        <div className="space-y-6">
          {/* CID header */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                    cidInfo.cached
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {cidInfo.cached ? 'Cached' : 'Not cached'}
                </span>
                {cidInfo.pinned && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-chart-2/10 text-chart-2 text-[11px] font-medium">
                    <Pin className="h-2.5 w-2.5" /> Pinned
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="text-[13px] font-mono text-foreground/80 break-all">
                  {cidInfo.cid}
                </code>
                <button
                  onClick={() => copyToClipboard(cidInfo.cid, 'cid')}
                  className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground"
                  aria-label="Copy CID"
                >
                  {copySuccess === 'cid' ? (
                    <Check className="h-3 w-3 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {cidInfo.pinned ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unpinCID(cidInfo.cid)}
                  className="h-7 text-[12px]"
                >
                  <PinOff className="h-3 w-3 mr-1" /> Unpin
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pinCID(cidInfo.cid)}
                  className="h-7 text-[12px]"
                >
                  <Pin className="h-3 w-3 mr-1" /> Pin
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[12px]"
                onClick={() =>
                  window.open(
                    `${WALCACHE_BASE_URL}/cdn/${cidInfo.cid}`,
                    '_blank',
                  )
                }
              >
                <ExternalLink className="h-3 w-3 mr-1" /> View
              </Button>
            </div>
          </div>

          {/* Metadata table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-[13px]">
              <tbody>
                {[
                  [
                    'Content type',
                    cidInfo.contentType || 'application/octet-stream',
                  ],
                  ['Size', formatBytes(cidInfo.size || 0)],
                  ['Source', getSourceLabel(cidInfo.source, cidInfo.cid)],
                  ...(cidInfo.cacheDate
                    ? [['Cached since', formatDate(cidInfo.cacheDate)]]
                    : []),
                  ...(cidInfo.ttl ? [['TTL', `${cidInfo.ttl}s`]] : []),
                ].map(([label, value], i) => (
                  <tr
                    key={label}
                    className={i > 0 ? 'border-t border-border' : ''}
                  >
                    <td className="px-4 py-2.5 text-muted-foreground w-40">
                      {label}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stats grid */}
          {cidInfo.stats && (
            <div className="space-y-3">
              <h3 className="text-[13px] font-medium text-foreground">
                Usage statistics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <StatItem
                  label="Total requests"
                  value={formatNumber(cidInfo.stats.requests)}
                />
                <StatItem
                  label="Hit rate"
                  value={formatPercentage(cidInfo.stats.hitRate)}
                  sub={`${cidInfo.stats.hits} hits / ${cidInfo.stats.misses} misses`}
                />
                <StatItem
                  label="Avg latency"
                  value={formatLatency(cidInfo.stats.avgLatency)}
                />
                <StatItem
                  label="Total served"
                  value={formatBytes(cidInfo.stats.totalSize)}
                />
              </div>
              <div className="grid grid-cols-2 gap-6 pt-2">
                <StatItem
                  label="First access"
                  value={formatDate(cidInfo.stats.firstAccess)}
                />
                <StatItem
                  label="Last access"
                  value={formatDate(cidInfo.stats.lastAccess)}
                />
              </div>
            </div>
          )}

          {!cidInfo.stats && (
            <div className="text-center py-8 text-[13px] text-muted-foreground">
              No usage data yet. Statistics appear after the first request.
            </div>
          )}

          {/* CDN URL copy */}
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
            <code className="text-[12px] font-mono text-muted-foreground flex-1 truncate">
              {WALCACHE_BASE_URL}/cdn/{cidInfo.cid}
            </code>
            <button
              onClick={() =>
                copyToClipboard(
                  `${WALCACHE_BASE_URL}/cdn/${cidInfo.cid}`,
                  'url',
                )
              }
              className="shrink-0 px-2.5 py-1 rounded text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {copySuccess === 'url' ? 'Copied' : 'Copy URL'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatItem({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className="text-lg font-bold text-foreground tabular-nums tracking-tight">
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground/70">{sub}</div>}
    </div>
  )
}
