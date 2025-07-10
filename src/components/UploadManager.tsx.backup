import { useState, useEffect, useCallback } from 'react'
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
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Database,
} from 'lucide-react'
import {
  formatBytes,
  formatDate,
  truncateCID,
  truncateText,
} from '../lib/utils'

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

export function UploadManager() {
  const [selectedVault, setSelectedVault] = useState<string>('')
  const [newVaultName, setNewVaultName] = useState('')
  const [showCreateVault, setShowCreateVault] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus>>(
    {},
  )
  const [showingLinksFor, setShowingLinksFor] = useState<string | null>(null)
  const [directUploads, setDirectUploads] = useState<
    Array<{
      blobId: string
      fileName: string
      size: number
      contentType: string
      cdnUrl: string
      directUrl: string
      uploadedAt: Date
      status: string
      suiRef?: string
    }>
  >([])

  const {
    vaults,
    files,
    uploads,
    isLoading,
    error,
    fetchVaults,
    createVault,
    fetchFiles,
    uploadFile,
    uploadAndVerify,
    uploadToWalrusAndVerify,
    checkBlobOnWalrus,
    deleteFile,
    setError,
  } = useWalcacheStore()

  useEffect(() => {
    fetchVaults()

    // Load direct uploads from localStorage
    const saved = localStorage.getItem('wcdn-direct-uploads')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Convert date strings back to Date objects
        const withDates = parsed.map((upload: any) => ({
          ...upload,
          uploadedAt: new Date(upload.uploadedAt),
        }))
        setDirectUploads(withDates)
      } catch (error) {
        console.warn('Failed to load direct uploads from localStorage:', error)
      }
    }
  }, [fetchVaults])

  useEffect(() => {
    if (selectedVault) {
      fetchFiles(selectedVault)
    }
  }, [selectedVault, fetchFiles])

  useEffect(() => {
    // Check Walrus status for all files using batch processing
    checkAllWalrusStatuses(files)
  }, [files])

  useEffect(() => {
    // Save direct uploads to localStorage
    localStorage.setItem('wcdn-direct-uploads', JSON.stringify(directUploads))
  }, [directUploads])

  const handleFileUpload = useCallback(
    async (fileList: FileList) => {
      if (fileList.length === 0) return

      if (vaults.length === 0) {
        setError('Please create a vault first')
        return
      }

      if (!selectedVault) {
        setError('Please select a vault before uploading')
        return
      }

      const file = fileList[0]
      try {
        // Use the new uploadAndVerify function
        const result = await uploadAndVerify(file, selectedVault)

        if (result.verified) {
          console.log(`✅ File uploaded and verified on ${result.network}!`)
          // Immediately update the file status since we verified it
          setFileStatuses((prev) => ({
            ...prev,
            [result.file.blobId]: {
              walrusExists: true,
              foundOnNetwork: result.network as 'testnet' | 'mainnet',
              lastChecked: new Date(),
            },
          }))
        } else {
          console.log(
            `⚠️ File uploaded to Vault but blob not yet available on Walrus`,
          )
          // Mark as syncing
          setFileStatuses((prev) => ({
            ...prev,
            [result.file.blobId]: {
              walrusExists: false,
              lastChecked: new Date(),
            },
          }))
        }
      } catch (error) {
        console.error('Upload failed:', error)
      }
    },
    [selectedVault, vaults.length, uploadAndVerify, setError],
  )

  const handleWalrusUpload = useCallback(
    async (fileList: FileList) => {
      if (fileList.length === 0) return

      const file = fileList[0]

      // Check file size (10MB limit for Walrus)
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Walrus has a 10MB limit.')
        return
      }

      try {
        console.log(`🚀 Testing direct Walrus upload for ${file.name}...`)
        const result = await uploadToWalrusAndVerify(file)

        if (result.verified) {
          console.log(
            `✅ Direct Walrus upload successful and verified on ${result.network}!`,
          )
          console.log('Upload result:', result.upload)

          // Store the successful upload info for reference
          setFileStatuses((prev) => ({
            ...prev,
            [result.upload.blobId]: {
              walrusExists: true,
              foundOnNetwork: result.network as 'testnet' | 'mainnet',
              lastChecked: new Date(),
            },
          }))

          // Add to direct uploads list for display
          setDirectUploads((prev) => [
            {
              blobId: result.upload.blobId,
              fileName: result.upload.fileName,
              size: result.upload.size,
              contentType: result.upload.contentType,
              cdnUrl: result.upload.cdnUrl,
              directUrl: result.upload.directUrl,
              uploadedAt: new Date(),
              status: result.upload.status,
              suiRef: result.upload.suiRef,
            },
            ...prev,
          ])

          // Show success message with details
          alert(
            `✅ Success!\n\nBlob ID: ${result.upload.blobId}\nNetwork: ${result.network}\nStatus: ${result.upload.status}\nSui Ref: ${result.upload.suiRef}`,
          )
        } else {
          console.log(
            `⚠️ Direct Walrus upload completed but blob not yet available on aggregators`,
          )
          console.log('Upload result:', result.upload)

          // Mark as uploaded but syncing
          setFileStatuses((prev) => ({
            ...prev,
            [result.upload.blobId]: {
              walrusExists: false,
              lastChecked: new Date(),
            },
          }))

          // Add to direct uploads list even if not verified yet
          setDirectUploads((prev) => [
            {
              blobId: result.upload.blobId,
              fileName: result.upload.fileName,
              size: result.upload.size,
              contentType: result.upload.contentType,
              cdnUrl: result.upload.cdnUrl,
              directUrl: result.upload.directUrl,
              uploadedAt: new Date(),
              status: result.upload.status + ' (syncing)',
              suiRef: result.upload.suiRef,
            },
            ...prev,
          ])

          alert(
            `⏳ Upload successful but still syncing\n\nBlob ID: ${result.upload.blobId}\nStatus: ${result.upload.status}\n\nThe blob may take a few minutes to appear on aggregators.`,
          )
        }
      } catch (error) {
        console.error('Direct Walrus upload failed:', error)
        setError(
          error instanceof Error
            ? error.message
            : 'Direct Walrus upload failed',
        )
      }
    },
    [uploadToWalrusAndVerify, setError],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files)
      }
    },
    [handleFileUpload],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleCreateVault = async () => {
    if (!newVaultName.trim()) return

    try {
      await createVault(newVaultName.trim())
      setNewVaultName('')
      setShowCreateVault(false)
    } catch (error) {
      console.error('Failed to create vault:', error)
    }
  }

  const handleDelete = async (fileId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this file? This action cannot be undone.',
      )
    ) {
      try {
        await deleteFile(fileId)
        // Success - the store will handle updating the UI and vault counts
      } catch (error) {
        console.error('Failed to delete file:', error)
        // Error is already set in the store, will be shown in UI
      }
    }
  }

  const copyToClipboard = async (
    url: string,
    type: 'cdn' | 'blobId' | 'aggregator' | 'download',
  ) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(type + ':' + url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

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
    setFileStatuses((prev) => ({
      ...prev,
      [blobId]: {
        ...prev[blobId],
        walrusExists: null,
        lastChecked: now,
      },
    }))

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
            setFileStatuses((prev) => ({
              ...prev,
              [blobId]: {
                ...prev[blobId],
                walrusExists: true,
                foundOnNetwork: network,
                workingAggregator: aggregator,
                lastChecked: now,
              },
            }))
            return true
          }
        } catch (endpointError) {
          console.log(`✗ ${aggregator} failed:`, endpointError)
        }
      }

      // If all endpoints fail, but this might be a sync issue
      setFileStatuses((prev) => ({
        ...prev,
        [blobId]: {
          ...prev[blobId],
          walrusExists: false,
          lastChecked: now,
        },
      }))
      return false
    } catch (error) {
      // Retry up to 2 times on network errors
      if (
        retryCount < 2 &&
        (error instanceof TypeError || error.name === 'NetworkError')
      ) {
        console.log(
          `Retrying Walrus check for ${blobId}, attempt ${retryCount + 1}`,
        )
        await new Promise((resolve) => setTimeout(resolve, 3000)) // Wait 3 seconds for Walrus sync
        return checkWalrusStatus(blobId, retryCount + 1)
      }

      console.error(`Failed to check Walrus status for ${blobId}:`, error)
      setFileStatuses((prev) => ({
        ...prev,
        [blobId]: {
          ...prev[blobId],
          walrusExists: null,
          lastChecked: now,
        },
      }))
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Upload Manager</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Upload files to Walrus via Tusky.io and access them through WCDN
        </p>
      </div>

      {/* Vault Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Vault</CardTitle>
          <CardDescription>
            Choose a vault to upload files to, or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full">
            <div className="flex-1 min-w-0">
              <Select
                value={selectedVault}
                onValueChange={setSelectedVault}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      isLoading ? 'Loading vaults...' : 'Select a vault...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {vaults.length === 0 && !isLoading ? (
                    <SelectItem value="no-vaults" disabled>
                      No vaults available - create one first
                    </SelectItem>
                  ) : (
                    vaults.map((vault) => {
                      // Calculate current file count for this vault
                      const currentFileCount = files.filter(
                        (f) => f.vaultId === vault.id,
                      ).length
                      return (
                        <SelectItem key={vault.id} value={vault.id}>
                          <div className="flex items-center space-x-2">
                            <Database className="h-4 w-4 text-gray-400" />
                            <span>
                              {truncateText(vault.name, 30)} ({currentFileCount}{' '}
                              files)
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowCreateVault(!showCreateVault)}
              className="w-full sm:w-auto shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Vault
            </Button>
          </div>

          {showCreateVault && (
            <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full">
              <div className="flex-1 min-w-0">
                <Input
                  placeholder="Vault name"
                  value={newVaultName}
                  onChange={(e) => setNewVaultName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateVault()}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 shrink-0">
                <Button
                  onClick={handleCreateVault}
                  disabled={!newVaultName.trim()}
                  className="w-full sm:w-auto"
                >
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateVault(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Drag and drop files here or click to select. Files will be uploaded
            to Walrus and automatically cached.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-4 sm:p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload
              className={`mx-auto h-8 w-8 sm:h-12 sm:w-12 mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`}
            />
            <p className="text-base sm:text-lg font-medium mb-2">
              {dragActive ? 'Drop files here' : 'Upload to Walrus'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">
              Max file size: 100MB (Vault) / 10MB (Direct Walrus)
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={(e) =>
                e.target.files && handleFileUpload(e.target.files)
              }
              disabled={!selectedVault && vaults.length === 0}
            />
            <input
              type="file"
              id="walrus-upload"
              className="hidden"
              onChange={(e) =>
                e.target.files && handleWalrusUpload(e.target.files)
              }
            />
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={!selectedVault && vaults.length === 0}
                className="w-full sm:w-auto"
              >
                Upload to Vault
              </Button>
              <Button
                onClick={() =>
                  document.getElementById('walrus-upload')?.click()
                }
                variant="outline"
                className="w-full sm:w-auto"
              >
                Direct to Walrus
              </Button>
            </div>
            {!selectedVault && vaults.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Create a vault first
              </p>
            )}
          </div>

          {/* Upload Progress */}
          {Object.entries(uploads).map(([id, upload]) => (
            <div key={id} className="mt-4 p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{upload.fileName}</span>
                <span className="text-sm text-gray-500">
                  {upload.status === 'uploading' &&
                    upload.progress < 80 &&
                    `Uploading ${upload.progress}%`}
                  {upload.status === 'uploading' &&
                    upload.progress >= 80 &&
                    'Verifying on Walrus...'}
                  {upload.status === 'completed' && '✅ Uploaded & Verified'}
                  {upload.status === 'error' && '❌ Failed'}
                </span>
              </div>
              {upload.status === 'uploading' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
              {upload.status === 'error' && upload.error && (
                <p className="text-sm text-red-600">{upload.error}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Files List */}
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
              <p className="text-gray-500">No files uploaded yet</p>
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
                                <span className="text-xs text-gray-400">
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
                                // Use the store function for consistency
                                const result = await checkBlobOnWalrus(
                                  file.blobId,
                                )
                                setFileStatuses((prev) => ({
                                  ...prev,
                                  [file.blobId]: {
                                    walrusExists: result.available,
                                    foundOnNetwork: result.network,
                                    workingAggregator: result.aggregator,
                                    lastChecked: new Date(),
                                  },
                                }))
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
                                setFileStatuses((prev) => {
                                  const newStatus = { ...prev }
                                  delete newStatus[file.blobId]
                                  return newStatus
                                })
                                checkWalrusStatus(file.blobId)
                              }}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer"
                            >
                              重新檢查
                            </button>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">
                          <span>{formatBytes(file.size)}</span>
                          <span className="mx-2">•</span>
                          <span>{formatDate(file.createdAt)}</span>
                          <span className="mx-2">•</span>
                          <span>Blob ID: {truncateCID(file.blobId)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        {/* Copy CDN URL */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(file.cdnUrl!, 'cdn')}
                          title="Copy CDN URL (fastest, cached)"
                          className="w-full sm:w-auto text-xs"
                        >
                          {copiedUrl === 'cdn:' + file.cdnUrl ? (
                            <Check className="h-3 w-3 text-green-600 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          CDN
                        </Button>

                        {/* Copy Blob ID */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(file.blobId, 'blobId')}
                          title="Copy Blob ID (Walrus identifier)"
                          className="w-full sm:w-auto text-xs"
                        >
                          {copiedUrl === 'blobId:' + file.blobId ? (
                            <Check className="h-3 w-3 text-green-600 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Blob ID
                        </Button>

                        {/* Copy Direct Aggregator URL */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Use working aggregator if we found one, otherwise default to testnet
                            const fileStatus = fileStatuses[file.blobId]
                            const aggregator =
                              fileStatus?.workingAggregator ||
                              WALRUS_AGGREGATORS[0]
                            const aggregatorUrl = `${aggregator}/v1/blobs/${file.blobId}`
                            copyToClipboard(aggregatorUrl, 'aggregator')
                          }}
                          title={`Copy Direct Walrus URL (${fileStatus?.foundOnNetwork || 'testnet'} network)`}
                          className="w-full sm:w-auto text-xs"
                        >
                          {copiedUrl?.startsWith('aggregator:') &&
                          copiedUrl.includes(file.blobId) ? (
                            <Check className="h-3 w-3 text-green-600 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Direct
                        </Button>

                        {/* Show Links */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowingLinksFor(
                              showingLinksFor === file.id ? null : file.id,
                            )
                          }}
                          title="Show all available links"
                          className="w-full sm:w-auto text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {showingLinksFor === file.id ? 'Hide' : 'Show'} Links
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(file.id)}
                          title="Delete File"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Links Display Area */}
                    {showingLinksFor === file.id && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border-t">
                        <h4 className="text-sm font-medium mb-2">
                          Available Links:
                        </h4>
                        <div className="space-y-2">
                          {/* CDN URL */}
                          {file.cdnUrl && (
                            <div className="flex items-center justify-between p-2 bg-white rounded border">
                              <div>
                                <span className="text-xs font-medium text-green-700">
                                  CDN URL (Cached)
                                </span>
                                <div className="text-xs text-gray-600 font-mono break-all">
                                  {file.cdnUrl}
                                </div>
                              </div>
                              <div className="flex space-x-1 ml-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    copyToClipboard(file.cdnUrl!, 'cdn')
                                  }
                                  className="text-xs"
                                >
                                  {copiedUrl === 'cdn:' + file.cdnUrl
                                    ? '✓'
                                    : 'Copy'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    window.open(file.cdnUrl, '_blank')
                                  }
                                  className="text-xs"
                                >
                                  Open
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Download URL */}
                          {(file as any).downloadUrl && (
                            <div className="flex items-center justify-between p-2 bg-white rounded border">
                              <div>
                                <span className="text-xs font-medium text-blue-700">
                                  Download URL (Backend)
                                </span>
                                <div className="text-xs text-gray-600 font-mono break-all">
                                  {(file as any).downloadUrl}
                                </div>
                              </div>
                              <div className="flex space-x-1 ml-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    copyToClipboard(
                                      (file as any).downloadUrl,
                                      'download',
                                    )
                                  }
                                  className="text-xs"
                                >
                                  {copiedUrl ===
                                  'download:' + (file as any).downloadUrl
                                    ? '✓'
                                    : 'Copy'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    window.open(
                                      (file as any).downloadUrl,
                                      '_blank',
                                    )
                                  }
                                  className="text-xs"
                                >
                                  Open
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Direct Walrus URL */}
                          <div className="flex items-center justify-between p-2 bg-white rounded border">
                            <div>
                              <span className="text-xs font-medium text-purple-700">
                                Direct Walrus URL (
                                {fileStatuses[file.blobId]?.foundOnNetwork ||
                                  'testnet'}
                                )
                              </span>
                              <div className="text-xs text-gray-600 font-mono break-all">
                                {fileStatuses[file.blobId]?.workingAggregator ||
                                  WALRUS_AGGREGATORS[0]}
                                /v1/blobs/{file.blobId}
                              </div>
                              {fileStatuses[file.blobId]?.walrusExists ===
                                false && (
                                <div className="text-xs text-orange-600 mt-1">
                                  ⚠️ May return 404 - still syncing
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const aggregator =
                                    fileStatuses[file.blobId]
                                      ?.workingAggregator ||
                                    WALRUS_AGGREGATORS[0]
                                  const url = `${aggregator}/v1/blobs/${file.blobId}`
                                  copyToClipboard(url, 'aggregator')
                                }}
                                className="text-xs"
                              >
                                {copiedUrl?.startsWith('aggregator:') &&
                                copiedUrl.includes(file.blobId)
                                  ? '✓'
                                  : 'Copy'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const aggregator =
                                    fileStatuses[file.blobId]
                                      ?.workingAggregator ||
                                    WALRUS_AGGREGATORS[0]
                                  const url = `${aggregator}/v1/blobs/${file.blobId}`
                                  window.open(url, '_blank')
                                }}
                                className="text-xs"
                                disabled={
                                  fileStatuses[file.blobId]?.walrusExists ===
                                  false
                                }
                              >
                                Open
                              </Button>
                            </div>
                          </div>

                          {/* Blob ID */}
                          <div className="flex items-center justify-between p-2 bg-white rounded border">
                            <div>
                              <span className="text-xs font-medium text-gray-700">
                                Blob ID
                              </span>
                              <div className="text-xs text-gray-600 font-mono break-all">
                                {file.blobId}
                              </div>
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  copyToClipboard(file.blobId, 'blobId')
                                }
                                className="text-xs"
                              >
                                {copiedUrl === 'blobId:' + file.blobId
                                  ? '✓'
                                  : 'Copy'}
                              </Button>
                            </div>
                          </div>
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

      {/* Direct Walrus Uploads */}
      {directUploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Direct Walrus Uploads</CardTitle>
            <CardDescription>
              Files uploaded directly to Walrus network (not stored in vaults)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {directUploads.map((upload) => {
                const fileStatus = fileStatuses[upload.blobId]
                const walrusExists = fileStatus?.walrusExists
                return (
                  <div
                    key={upload.blobId}
                    className="border rounded-lg p-4 bg-blue-50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium truncate">
                            {upload.fileName}
                          </h3>
                          {walrusExists === true && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              ✓ Available on Walrus
                            </span>
                          )}
                          {walrusExists === false && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Syncing
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">
                          <span>{formatBytes(upload.size)}</span>
                          <span className="mx-2">•</span>
                          <span>
                            {formatDate(upload.uploadedAt.toISOString())}
                          </span>
                          <span className="mx-2">•</span>
                          <span>Blob ID: {truncateCID(upload.blobId)}</span>
                          <span className="mx-2">•</span>
                          <span>Status: {upload.status}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        {/* Copy CDN URL */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(upload.cdnUrl, 'cdn')}
                          title="Copy CDN URL (fastest, cached)"
                          className="w-full sm:w-auto text-xs"
                        >
                          {copiedUrl === 'cdn:' + upload.cdnUrl ? (
                            <Check className="h-3 w-3 text-green-600 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          CDN
                        </Button>

                        {/* Copy Blob ID */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(upload.blobId, 'blobId')
                          }
                          title="Copy Blob ID (Walrus identifier)"
                          className="w-full sm:w-auto text-xs"
                        >
                          {copiedUrl === 'blobId:' + upload.blobId ? (
                            <Check className="h-3 w-3 text-green-600 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Blob ID
                        </Button>

                        {/* Copy Direct URL */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(upload.directUrl, 'aggregator')
                          }
                          title="Copy Direct Walrus URL"
                          className="w-full sm:w-auto text-xs"
                        >
                          {copiedUrl === 'aggregator:' + upload.directUrl ? (
                            <Check className="h-3 w-3 text-green-600 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Direct
                        </Button>

                        {/* View Links */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowingLinksFor(
                              showingLinksFor === upload.blobId
                                ? null
                                : upload.blobId,
                            )
                          }}
                          title="Show all available links"
                          className="w-full sm:w-auto text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {showingLinksFor === upload.blobId
                            ? 'Hide'
                            : 'Show'}{' '}
                          Links
                        </Button>
                      </div>
                    </div>

                    {/* Links Display Area for Direct Uploads */}
                    {showingLinksFor === upload.blobId && (
                      <div className="mt-4 p-3 bg-white rounded-lg border-t">
                        <h4 className="text-sm font-medium mb-2">
                          Available Links:
                        </h4>
                        <div className="space-y-2">
                          {/* CDN URL */}
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <div>
                              <span className="text-xs font-medium text-green-700">
                                CDN URL (Cached)
                              </span>
                              <div className="text-xs text-gray-600 font-mono break-all">
                                {upload.cdnUrl}
                              </div>
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  copyToClipboard(upload.cdnUrl, 'cdn')
                                }
                                className="text-xs"
                              >
                                {copiedUrl === 'cdn:' + upload.cdnUrl
                                  ? '✓'
                                  : 'Copy'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  window.open(upload.cdnUrl, '_blank')
                                }
                                className="text-xs"
                              >
                                Open
                              </Button>
                            </div>
                          </div>

                          {/* Direct Walrus URL */}
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <div>
                              <span className="text-xs font-medium text-purple-700">
                                Direct Walrus URL
                              </span>
                              <div className="text-xs text-gray-600 font-mono break-all">
                                {upload.directUrl}
                              </div>
                              {walrusExists === false && (
                                <div className="text-xs text-orange-600 mt-1">
                                  ⚠️ May return 404 - still syncing
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  copyToClipboard(
                                    upload.directUrl,
                                    'aggregator',
                                  )
                                }
                                className="text-xs"
                              >
                                {copiedUrl === 'aggregator:' + upload.directUrl
                                  ? '✓'
                                  : 'Copy'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  window.open(upload.directUrl, '_blank')
                                }
                                className="text-xs"
                                disabled={walrusExists === false}
                              >
                                Open
                              </Button>
                            </div>
                          </div>

                          {/* Blob ID */}
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <div>
                              <span className="text-xs font-medium text-gray-700">
                                Blob ID
                              </span>
                              <div className="text-xs text-gray-600 font-mono break-all">
                                {upload.blobId}
                              </div>
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  copyToClipboard(upload.blobId, 'blobId')
                                }
                                className="text-xs"
                              >
                                {copiedUrl === 'blobId:' + upload.blobId
                                  ? '✓'
                                  : 'Copy'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card>
          <CardContent className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
