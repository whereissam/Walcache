import { useState, useEffect, memo } from 'react'
import { useVaults, useFiles, useDeleteFile } from '../hooks/api/useVaults'
import { useCheckBlobOnWalrus } from '../hooks/api/useWalrus'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Button } from './ui/button'
import { ExternalLink, Copy, Check, AlertTriangle, Trash2 } from 'lucide-react'
import { formatBytes, formatDate, truncateCID } from '../lib/utils'

// Walrus endpoints (testnet first, then mainnet)
const WALRUS_AGGREGATORS = [
  // Testnet aggregators (where most development happens)
  'https://aggregator.walrus-testnet.walrus.space',
  'https://aggregator.testnet.walrus.atalma.io',
  'https://sui-walrus-tn-aggregator.bwarelabs.com',

  // Mainnet aggregators (production data)
  'https://aggregator.walrus-mainnet.walrus.space',
  'https://aggregator.walrus.atalma.io',
  'https://sui-walrus-mainnet-aggregator.bwarelabs.com',
  'https://walrus.globalstake.io',
]

interface FileStatus {
  walrusExists: boolean | null // true=可用, false=不存在/同步中, null=檢查失敗
  foundOnNetwork?: 'testnet' | 'mainnet' // 在哪個網絡找到
  workingAggregator?: string // 可用的 aggregator URL
  suiObjectExists?: boolean // Sui 區塊鏈上是否有對應物件
  lastChecked?: Date
}

interface FilesListProps {
  selectedVault: string
  fileStatuses: Record<string, FileStatus>
  onFileStatusChange: (blobId: string, status: FileStatus) => void
  copiedUrl: string | null
  showingLinksFor: string | null
  onCopyUrl: (
    url: string,
    type: 'cdn' | 'blobId' | 'aggregator' | 'download',
  ) => void
  onToggleLinks: (fileId: string | null) => void
}

export const FilesList = memo(function FilesList({
  selectedVault,
  fileStatuses,
  onFileStatusChange,
  copiedUrl,
  showingLinksFor,
  onCopyUrl,
  onToggleLinks,
}: FilesListProps) {
  const { data: vaults = [] } = useVaults()
  const { data: files = [], isLoading } = useFiles(selectedVault)
  const deleteFileMutation = useDeleteFile()
  const checkBlobMutation = useCheckBlobOnWalrus()

  const checkWalrusStatus = async (
    blobId: string,
    retryCount = 0,
  ): Promise<boolean | null> => {
    const existing = fileStatuses[blobId]
    const now = new Date()

    // Return cached result if checked within last 5 minutes
    if (
      existing?.lastChecked &&
      now.getTime() - existing.lastChecked.getTime() < 5 * 60 * 1000
    ) {
      return existing.walrusExists
    }

    // Set as checking
    onFileStatusChange(blobId, {
      ...existing,
      walrusExists: null,
      lastChecked: now,
    })

    try {
      // Try multiple Walrus aggregators (testnet first, then mainnet)
      for (const aggregator of WALRUS_AGGREGATORS) {
        try {
          const endpoint = `${aggregator}/v1/blobs/${blobId}`
          console.log(`Checking ${endpoint}...`)

          const response = await fetch(endpoint, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000), // 10 second timeout for Walrus
          })

          if (response.ok) {
            console.log(`✓ Found blob on ${aggregator}`)
            const network = aggregator.includes('testnet')
              ? 'testnet'
              : 'mainnet'
            onFileStatusChange(blobId, {
              walrusExists: true,
              foundOnNetwork: network,
              workingAggregator: aggregator,
              lastChecked: now,
            })
            return true
          }
        } catch (error) {
          console.log(`Failed to check ${aggregator}:`, error)
          continue
        }
      }

      // If we get here, blob wasn't found on any aggregator
      console.log(`❌ Blob ${blobId} not found on any Walrus aggregator`)
      onFileStatusChange(blobId, {
        walrusExists: false,
        lastChecked: now,
      })
      return false
    } catch (error) {
      console.error(`Error checking Walrus status for ${blobId}:`, error)
      onFileStatusChange(blobId, {
        walrusExists: null,
        lastChecked: now,
      })
      return null
    }
  }

  const checkAllWalrusStatuses = async (fileList: typeof files) => {
    const now = new Date()
    const uncheckedFiles = fileList.filter((file) => {
      const status = fileStatuses[file.blobId]
      // Check if never checked or last check was over 5 minutes ago
      return (
        !status?.lastChecked ||
        now.getTime() - status.lastChecked.getTime() > 5 * 60 * 1000
      )
    })

    if (uncheckedFiles.length === 0) return

    // Process in batches of 3 to avoid overwhelming the aggregator (reduced from 5)
    const batchSize = 3
    for (let i = 0; i < uncheckedFiles.length; i += batchSize) {
      const batch = uncheckedFiles.slice(i, i + batchSize)
      await Promise.all(batch.map((file) => checkWalrusStatus(file.blobId)))

      // Longer delay between batches for Walrus
      if (i + batchSize < uncheckedFiles.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  const handleDelete = async (fileId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this file? This action cannot be undone.',
      )
    ) {
      try {
        await deleteFileMutation.mutateAsync(fileId)
        // Success - React Query will handle updating the UI and vault counts
      } catch (error) {
        console.error('Failed to delete file:', error)
      }
    }
  }

  useEffect(() => {
    // Check Walrus status for all files using batch processing
    checkAllWalrusStatuses(files)
  }, [files])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uploaded Files</CardTitle>
        <CardDescription>
          Files in{' '}
          {selectedVault
            ? vaults.find((v) => v.id === selectedVault)?.name
            : 'all vaults'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && files.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No files uploaded yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => {
              const fileStatus = fileStatuses[file.blobId]
              const walrusExists = fileStatus?.walrusExists
              const lastChecked = fileStatus?.lastChecked
              return (
                <div key={file.id} className="border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium truncate">{file.name}</h3>
                        {walrusExists === false && (
                          <div className="flex items-center space-x-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Vault已註冊，Blob同步中
                            </span>
                            {lastChecked && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {Math.round(
                                  (new Date().getTime() -
                                    lastChecked.getTime()) /
                                    60000,
                                )}
                                分前檢查
                              </span>
                            )}
                          </div>
                        )}
                        {walrusExists === true && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            ✓ Walrus可用 ({fileStatus?.foundOnNetwork})
                          </span>
                        )}
                        {walrusExists === undefined && (
                          <button
                            onClick={async () => {
                              try {
                                const result =
                                  await checkBlobMutation.mutateAsync(
                                    file.blobId,
                                  )
                                onFileStatusChange(file.blobId, {
                                  walrusExists: result.available,
                                  foundOnNetwork: result.network,
                                  workingAggregator: result.aggregator,
                                  lastChecked: new Date(),
                                })
                              } catch (error) {
                                console.error(
                                  'Failed to check blob on Walrus:',
                                  error,
                                )
                              }
                            }}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                          >
                            檢查Walrus狀態
                          </button>
                        )}
                        {walrusExists === null && (
                          <button
                            onClick={() => {
                              // Reset status and retry
                              const { [file.blobId]: removed, ...newStatuses } =
                                fileStatuses
                              checkWalrusStatus(file.blobId)
                            }}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer"
                          >
                            重新檢查
                          </button>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>{formatBytes(file.size)}</span>
                        <span className="mx-2">•</span>
                        <span>{formatDate(file.createdAt)}</span>
                        <span className="mx-2">•</span>
                        <span>Blob: {truncateCID(file.blobId, 12)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onToggleLinks(
                            showingLinksFor === file.id ? null : file.id,
                          )
                        }
                        className="text-xs px-2 py-1 h-auto"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Links
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                        className="text-xs px-2 py-1 h-auto text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {showingLinksFor === file.id && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="text-sm font-medium">Access Links:</div>
                      <div className="space-y-2">
                        {/* CDN URL */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            CDN URL:
                          </span>
                          <div className="flex items-center space-x-1">
                            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded max-w-xs truncate">
                              {file.cdnUrl}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onCopyUrl(file.cdnUrl, 'cdn')}
                              className="h-6 w-6 p-0"
                            >
                              {copiedUrl === 'cdn:' + file.cdnUrl ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Blob ID */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            Blob ID:
                          </span>
                          <div className="flex items-center space-x-1">
                            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded max-w-xs truncate">
                              {file.blobId}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onCopyUrl(file.blobId, 'blobId')}
                              className="h-6 w-6 p-0"
                            >
                              {copiedUrl === 'blobId:' + file.blobId ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Walrus Aggregator URL (if available) */}
                        {fileStatus?.workingAggregator && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 dark:text-gray-300">
                              Walrus URL:
                            </span>
                            <div className="flex items-center space-x-1">
                              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded max-w-xs truncate">
                                {fileStatus.workingAggregator}/v1/blobs/
                                {file.blobId}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  onCopyUrl(
                                    `${fileStatus.workingAggregator}/v1/blobs/${file.blobId}`,
                                    'aggregator',
                                  )
                                }
                                className="h-6 w-6 p-0"
                              >
                                {copiedUrl ===
                                'aggregator:' +
                                  `${fileStatus.workingAggregator}/v1/blobs/${file.blobId}` ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
