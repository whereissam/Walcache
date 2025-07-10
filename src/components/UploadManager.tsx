import { useState, useEffect, useCallback, memo } from 'react'
import { useWalcacheStore } from '../store/walcacheStore'
import { Card, CardContent } from './ui/card'
import { VaultSelector } from './VaultSelector'
import { FileUploader } from './FileUploader'
import { FilesList } from './FilesList'
import { DirectUploads } from './DirectUploads'

interface FileStatus {
  walrusExists: boolean | null // true=可用, false=不存在/同步中, null=檢查失敗
  foundOnNetwork?: 'testnet' | 'mainnet' // 在哪個網絡找到
  workingAggregator?: string // 可用的 aggregator URL
  suiObjectExists?: boolean // Sui 區塊鏈上是否有對應物件
  lastChecked?: Date
}

interface DirectUpload {
  blobId: string
  fileName: string
  size: number
  contentType: string
  cdnUrl: string
  directUrl: string
  uploadedAt: Date
  status: string
  suiRef?: string
}

export const UploadManager = memo(function UploadManager() {
  const [selectedVault, setSelectedVault] = useState<string>('')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus>>(
    {},
  )
  const [showingLinksFor, setShowingLinksFor] = useState<string | null>(null)
  const [directUploads, setDirectUploads] = useState<DirectUpload[]>([])

  const {
    fetchVaults,
    fetchFiles,
    uploadAndVerify,
    uploadToWalrusAndVerify,
    setError,
    error,
  } = useWalcacheStore()

  useEffect(() => {
    fetchVaults()

    // Load direct uploads from localStorage
    const saved = localStorage.getItem('wcdn-direct-uploads')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Array<{
          blobId: string
          fileName: string
          size: number
          contentType: string
          cdnUrl: string
          directUrl: string
          uploadedAt: string
          status: string
          suiRef?: string
        }>
        // Convert date strings back to Date objects
        const withDates = parsed.map((upload) => ({
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
    // Save direct uploads to localStorage
    localStorage.setItem('wcdn-direct-uploads', JSON.stringify(directUploads))
  }, [directUploads])

  const handleFileUpload = useCallback(
    async (fileList: FileList) => {
      if (fileList.length === 0) return

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
    [selectedVault, uploadAndVerify, setError],
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

  const handleFileStatusChange = (blobId: string, status: FileStatus) => {
    setFileStatuses((prev) => ({
      ...prev,
      [blobId]: status,
    }))
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
      <VaultSelector
        selectedVault={selectedVault}
        onVaultChange={setSelectedVault}
      />

      {/* File Upload */}
      <FileUploader
        selectedVault={selectedVault}
        onFileUpload={handleFileUpload}
        onWalrusUpload={handleWalrusUpload}
      />

      {/* Files List */}
      <FilesList
        selectedVault={selectedVault}
        fileStatuses={fileStatuses}
        onFileStatusChange={handleFileStatusChange}
        copiedUrl={copiedUrl}
        showingLinksFor={showingLinksFor}
        onCopyUrl={copyToClipboard}
        onToggleLinks={setShowingLinksFor}
      />

      {/* Direct Walrus Uploads */}
      <DirectUploads
        directUploads={directUploads}
        fileStatuses={fileStatuses}
        copiedUrl={copiedUrl}
        showingLinksFor={showingLinksFor}
        onCopyUrl={copyToClipboard}
        onToggleLinks={setShowingLinksFor}
      />

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
})
