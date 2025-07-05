import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Check, Globe, Zap, Clock, AlertTriangle } from 'lucide-react'
import type { SupportedChain, ChainInfo } from '../types/chains'
import { CHAIN_CONFIG } from '../types/chains'

// Re-export for convenience
export type { SupportedChain }

interface ChainSelectorProps {
  selectedChain: SupportedChain
  onChainSelect: (chain: SupportedChain) => void
  showBlobStatus?: boolean
  blobId?: string
  className?: string
}

interface ChainBlobStatus {
  available: boolean
  latency?: number
  lastChecked?: Date
  error?: string
}

// Mock function for blob status - in real app this would call the SDK
function getMockBlobStatus(
  chain: SupportedChain,
  blobId?: string,
): ChainBlobStatus {
  if (!blobId) return { available: false }

  // For Sui, simulate real status
  if (chain === 'sui') {
    return {
      available: true,
      latency: Math.floor(Math.random() * 100) + 50,
      lastChecked: new Date(),
    }
  }

  // For other chains, simulate mock status
  return {
    available: Math.random() > 0.3, // 70% chance available
    latency: Math.floor(Math.random() * 200) + 100,
    lastChecked: new Date(),
  }
}

export function ChainSelector({
  selectedChain,
  onChainSelect,
  showBlobStatus = false,
  blobId,
  className = '',
}: ChainSelectorProps) {
  const [blobStatuses, setBlobStatuses] = React.useState<
    Record<SupportedChain, ChainBlobStatus>
  >({})

  React.useEffect(() => {
    if (showBlobStatus && blobId) {
      // Check blob status on all chains
      const statuses: Record<SupportedChain, ChainBlobStatus> = {} as any
      ;(['sui', 'ethereum', 'solana'] as SupportedChain[]).forEach((chain) => {
        statuses[chain] = getMockBlobStatus(chain, blobId)
      })
      setBlobStatuses(statuses)
    }
  }, [showBlobStatus, blobId])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Globe className="h-5 w-5" />
          <span>Multi-Chain Selection</span>
        </CardTitle>
        <CardDescription>
          Choose blockchain network for Walrus CDN access
          {showBlobStatus && blobId && (
            <span className="block mt-1 text-xs text-blue-600">
              Showing blob status for: {blobId.slice(0, 8)}...{blobId.slice(-8)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['sui', 'ethereum', 'solana'] as SupportedChain[]).map((chain) => {
            const config = CHAIN_CONFIG[chain]
            const isSelected = selectedChain === chain
            const blobStatus = blobStatuses[chain]

            return (
              <Button
                key={chain}
                variant={isSelected ? 'default' : 'outline'}
                className={`h-auto p-4 flex flex-col items-start space-y-2 ${
                  isSelected ? '' : config.bgColor
                } ${isSelected ? '' : 'hover:' + config.bgColor}`}
                onClick={() => onChainSelect(chain)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className="font-semibold">{config.displayName}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4" />}
                </div>

                <div className="flex flex-wrap gap-1 w-full">
                  <Badge
                    variant={
                      config.status === 'active' ? 'default' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {config.status === 'active' ? '🟢 Active' : '🔶 Mock'}
                  </Badge>

                  {showBlobStatus && blobStatus && (
                    <Badge
                      variant={blobStatus.available ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {blobStatus.available ? (
                        <span className="flex items-center space-x-1">
                          <Zap className="h-3 w-3" />
                          <span>{blobStatus.latency}ms</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>N/A</span>
                        </span>
                      )}
                    </Badge>
                  )}
                </div>

                <p className={`text-xs ${config.color} text-left w-full`}>
                  {config.description}
                </p>

                {showBlobStatus && blobStatus?.lastChecked && (
                  <p className="text-xs text-gray-500 w-full text-left">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Checked{' '}
                    {Math.round(
                      (new Date().getTime() -
                        blobStatus.lastChecked.getTime()) /
                        1000,
                    )}
                    s ago
                  </p>
                )}
              </Button>
            )
          })}
        </div>

        {/* Chain Comparison Table */}
        {showBlobStatus && Object.keys(blobStatuses).length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">
              Multi-Chain Availability Summary
            </h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="font-medium">Chain</div>
              <div className="font-medium">Status</div>
              <div className="font-medium">Latency</div>

              {(['sui', 'ethereum', 'solana'] as SupportedChain[]).map(
                (chain) => {
                  const status = blobStatuses[chain]
                  const config = CHAIN_CONFIG[chain]
                  return (
                    <React.Fragment key={chain}>
                      <div className="flex items-center space-x-1">
                        <span>{config.icon}</span>
                        <span>{config.displayName}</span>
                      </div>
                      <div>
                        {status?.available ? (
                          <span className="text-green-600">✓ Available</span>
                        ) : (
                          <span className="text-red-600">✗ N/A</span>
                        )}
                      </div>
                      <div className="text-gray-600">
                        {status?.latency ? `${status.latency}ms` : '-'}
                      </div>
                    </React.Fragment>
                  )
                },
              )}
            </div>

            <div className="mt-2 text-xs text-blue-600">
              💡 <strong>Pro Tip:</strong> Use SDK function{' '}
              <code>getWalrusCDNUrl(blobId, &#123;chain&#125;)</code> to
              automatically get the best URL
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
