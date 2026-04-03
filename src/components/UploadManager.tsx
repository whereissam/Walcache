import { memo, useCallback, useEffect, useState } from 'react'
import { useWalcacheStore } from '../store/walcacheStore'
import { VaultSelector } from './VaultSelector'
import { FileUploader } from './FileUploader'
import { FilesList } from './FilesList'
import { DirectUploads } from './DirectUploads'
import { ErrorHandler, useErrorHandler } from './ErrorHandler'

interface FileStatus {
  walrusExists: boolean | null
  foundOnNetwork?: 'testnet' | 'mainnet'
  workingAggregator?: string
  suiObjectExists?: boolean
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
  const [directUploads, setDirectUploads] = useState<Array<DirectUpload>>([])

  const {
    fetchVaults,
    fetchFiles,
    uploadAndVerify,
    uploadToWalrusAndVerify,
    setError,
    error,
    createUpload,
    fetchBlob,
  } = useWalcacheStore()

  const { handleError, shouldShowRetry } = useErrorHandler()

  useEffect(() => {
    fetchVaults()
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
        setDirectUploads(
          parsed.map((u) => ({ ...u, uploadedAt: new Date(u.uploadedAt) })),
        )
      } catch {
        // ignore
      }
    }
  }, [fetchVaults])

  useEffect(() => {
    if (selectedVault) fetchFiles(selectedVault)
  }, [selectedVault, fetchFiles])

  useEffect(() => {
    localStorage.setItem('wcdn-direct-uploads', JSON.stringify(directUploads))
  }, [directUploads])

  const handleFileUpload = useCallback(
    async (fileList: FileList) => {
      if (fileList.length === 0) return
      if (!selectedVault) {
        setError('Select a vault before uploading')
        return
      }
      const file = fileList[0]
      try {
        try {
          const upload = await createUpload(file, { vault_id: selectedVault })
          const blob = await fetchBlob(upload.blob_id)
          setFileStatuses((prev) => ({
            ...prev,
            [blob.id]: { walrusExists: blob.cached, lastChecked: new Date() },
          }))
        } catch {
          const result = await uploadAndVerify(file, selectedVault)
          setFileStatuses((prev) => ({
            ...prev,
            [result.file.blobId]: {
              walrusExists: result.verified,
              foundOnNetwork: result.verified
                ? (result.network as 'testnet' | 'mainnet')
                : undefined,
              lastChecked: new Date(),
            },
          }))
        }
      } catch (err) {
        setError(handleError(err))
      }
    },
    [
      selectedVault,
      createUpload,
      fetchBlob,
      uploadAndVerify,
      setError,
      handleError,
    ],
  )

  const handleWalrusUpload = useCallback(
    async (fileList: FileList) => {
      if (fileList.length === 0) return
      const file = fileList[0]
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Walrus has a 10MB limit.')
        return
      }
      try {
        const result = await uploadToWalrusAndVerify(file)
        setFileStatuses((prev) => ({
          ...prev,
          [result.upload.blobId]: {
            walrusExists: result.verified,
            foundOnNetwork: result.verified
              ? (result.network as 'testnet' | 'mainnet')
              : undefined,
            lastChecked: new Date(),
          },
        }))
        setDirectUploads((prev) => [
          {
            blobId: result.upload.blobId,
            fileName: result.upload.fileName,
            size: result.upload.size,
            contentType: result.upload.contentType,
            cdnUrl: result.upload.cdnUrl,
            directUrl: result.upload.directUrl,
            uploadedAt: new Date(),
            status: result.verified
              ? result.upload.status
              : result.upload.status + ' (syncing)',
            suiRef: result.upload.suiRef,
          },
          ...prev,
        ])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Direct Walrus upload failed',
        )
      }
    },
    [uploadToWalrusAndVerify, setError],
  )

  const copyToClipboard = async (
    url: string,
    type: 'cdn' | 'blobId' | 'aggregator' | 'download',
  ) => {
    await navigator.clipboard.writeText(url)
    setCopiedUrl(type + ':' + url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Upload files to Walrus and serve them through the CDN.
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
        onFileStatusChange={(blobId, status) =>
          setFileStatuses((prev) => ({ ...prev, [blobId]: status }))
        }
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

      {/* Error */}
      {error && (
        <ErrorHandler
          error={error}
          onRetry={shouldShowRetry(error) ? () => setError(null) : undefined}
          onDismiss={() => setError(null)}
          showRetry={shouldShowRetry(error)}
        />
      )}
    </div>
  )
})
