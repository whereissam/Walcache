import { memo, useCallback, useState } from 'react'
import { AlertTriangle, Upload } from 'lucide-react'
import { useWalcacheStore } from '../store/walcacheStore'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Button } from './ui/button'

interface FileUploaderProps {
  selectedVault: string
  onUploadSuccess?: () => void
  onFileUpload: (fileList: FileList) => Promise<void>
  onWalrusUpload: (fileList: FileList) => Promise<void>
}

export const FileUploader = memo(function FileUploader({
  selectedVault,
  onFileUpload,
  onWalrusUpload,
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false)

  const { vaults, uploads } = useWalcacheStore()

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileUpload(e.dataTransfer.files)
      }
    },
    [onFileUpload],
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
        <CardDescription>
          Drag and drop files here or click to select. Files will be uploaded to
          Walrus and automatically cached.
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
            onChange={(e) => e.target.files && onFileUpload(e.target.files)}
            disabled={!selectedVault && vaults.length === 0}
          />
          <input
            type="file"
            id="walrus-upload"
            className="hidden"
            onChange={(e) => e.target.files && onWalrusUpload(e.target.files)}
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
              onClick={() => document.getElementById('walrus-upload')?.click()}
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
              <span className="text-sm font-medium">{upload.filename}</span>
              <span className="text-sm text-muted-foreground">
                {upload.status === 'processing' && 'Processing...'}
                {upload.status === 'completed' && 'Uploaded'}
                {upload.status === 'failed' && 'Failed'}
              </span>
            </div>
            {upload.status === 'processing' && (
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full animate-pulse w-2/3" />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
})
