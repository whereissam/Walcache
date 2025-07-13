import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Loader2, Upload, Shield, Key, Clock, Users, Globe } from 'lucide-react'

interface SealUploadProps {
  onUploadComplete?: (result: any) => void
}

interface UploadResult {
  success: boolean
  data?: {
    id: string
    contentId: string
    packageId: string
    threshold: number
    cdnUrl: string
    encrypted: boolean
    metadata: {
      originalSize: number
      encryptedSize: number
      filename: string
      mimetype: string
      name?: string
      description?: string
    }
  }
  error?: string
}

export function SealUpload({ onUploadComplete }: SealUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [packageId, setPackageId] = useState('') // User needs to provide their deployed package ID
  const [contentId, setContentId] = useState('')
  const [threshold, setThreshold] = useState('2')
  const [accessType, setAccessType] = useState('owner-only')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setName(selectedFile.name)
      setError(null)
    }
  }

  const generateContentId = async () => {
    try {
      const response = await fetch('/seal/generate-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()
      if (result.success) {
        setContentId(result.data.contentId)
      }
    } catch (err) {
      console.error('Failed to generate content ID:', err)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    if (!packageId) {
      setError('Package ID is required. Deploy the Move contract first.')
      return
    }

    if (!contentId) {
      setError('Content ID is required. Generate one or provide your own.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('packageId', packageId)
      formData.append('contentId', contentId)
      formData.append('threshold', threshold)
      formData.append('name', name)
      formData.append('description', description)

      const response = await fetch('/seal/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadResult: UploadResult = await response.json()

      if (uploadResult.success) {
        setResult(uploadResult)
        onUploadComplete?.(uploadResult)
      } else {
        setError(uploadResult.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const getAccessTypeIcon = (type: string) => {
    switch (type) {
      case 'owner-only':
        return <Shield className="h-4 w-4" />
      case 'allowlist':
        return <Users className="h-4 w-4" />
      case 'time-based':
        return <Clock className="h-4 w-4" />
      case 'public':
        return <Globe className="h-4 w-4" />
      default:
        return <Key className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Seal Encrypted Upload
          </CardTitle>
          <CardDescription>
            Upload files with blockchain-based access control using Mysten's Seal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            {file && (
              <div className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Package ID */}
          <div className="space-y-2">
            <Label htmlFor="packageId">Move Package ID *</Label>
            <Input
              id="packageId"
              placeholder="0x123... (your deployed access control package)"
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              disabled={uploading}
            />
            <div className="text-xs text-muted-foreground">
              Deploy the Move access control contract and paste the package ID here
            </div>
          </div>

          {/* Content ID */}
          <div className="space-y-2">
            <Label htmlFor="contentId">Content ID</Label>
            <div className="flex gap-2">
              <Input
                id="contentId"
                placeholder="Unique identifier for this content"
                value={contentId}
                onChange={(e) => setContentId(e.target.value)}
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateContentId}
                disabled={uploading}
              >
                Generate
              </Button>
            </div>
          </div>

          {/* Access Type */}
          <div className="space-y-2">
            <Label>Access Control Type</Label>
            <Select value={accessType} onValueChange={setAccessType} disabled={uploading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner-only">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Owner Only
                  </div>
                </SelectItem>
                <SelectItem value="allowlist">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Allowlist
                  </div>
                </SelectItem>
                <SelectItem value="time-based">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time-based
                  </div>
                </SelectItem>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Public
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              You'll need to create the corresponding access control object on-chain
            </div>
          </div>

          {/* Threshold */}
          <div className="space-y-2">
            <Label htmlFor="threshold">Decryption Threshold</Label>
            <Select value={threshold} onValueChange={setThreshold} disabled={uploading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 key server</SelectItem>
                <SelectItem value="2">2 key servers (recommended)</SelectItem>
                <SelectItem value="3">3 key servers (high security)</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              Number of key servers required for decryption
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              placeholder="Display name for this content"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Description of this content"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              rows={3}
            />
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!file || !packageId || !contentId || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Encrypting & Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Encrypted File
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Upload Result */}
      {result && result.success && result.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Upload Successful
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Blob ID</Label>
                <div className="font-mono text-xs break-all">{result.data.id}</div>
              </div>
              <div>
                <Label>Content ID</Label>
                <div className="font-mono text-xs break-all">{result.data.contentId}</div>
              </div>
              <div>
                <Label>Package ID</Label>
                <div className="font-mono text-xs break-all">{result.data.packageId}</div>
              </div>
              <div>
                <Label>Threshold</Label>
                <Badge variant="secondary">{result.data.threshold} servers</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>CDN URL</Label>
              <div className="flex gap-2">
                <Input
                  value={result.data.cdnUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(result.data.cdnUrl, '_blank')}
                >
                  Open
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Original Size</Label>
                <div>{(result.data.metadata.originalSize / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <div>
                <Label>Encrypted Size</Label>
                <div>{(result.data.metadata.encryptedSize / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            </div>

            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                <strong>Next Steps:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Deploy the access control object on Sui using the Move contract</li>
                  <li>Configure access permissions (add users to allowlist, set expiration, etc.)</li>
                  <li>Users can decrypt by calling the appropriate seal_approve function</li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SealUpload