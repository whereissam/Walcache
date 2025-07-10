import { memo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Button } from './ui/button'
import { ExternalLink, Copy, Check, AlertTriangle } from 'lucide-react'
import { formatBytes, formatDate, truncateCID } from '../lib/utils'

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

interface DirectUploadsProps {
  directUploads: DirectUpload[]
  fileStatuses: Record<string, FileStatus>
  copiedUrl: string | null
  showingLinksFor: string | null
  onCopyUrl: (
    url: string,
    type: 'cdn' | 'blobId' | 'aggregator' | 'download',
  ) => void
  onToggleLinks: (blobId: string | null) => void
}

export const DirectUploads = memo(function DirectUploads({
  directUploads,
  fileStatuses,
  copiedUrl,
  showingLinksFor,
  onCopyUrl,
  onToggleLinks,
}: DirectUploadsProps) {
  if (directUploads.length === 0) {
    return null
  }

  return (
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
                      <span>{formatDate(upload.uploadedAt.toISOString())}</span>
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
                      onClick={() => onCopyUrl(upload.cdnUrl, 'cdn')}
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
                      onClick={() => onCopyUrl(upload.blobId, 'blobId')}
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
                      onClick={() => onCopyUrl(upload.directUrl, 'aggregator')}
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
                        onToggleLinks(
                          showingLinksFor === upload.blobId
                            ? null
                            : upload.blobId,
                        )
                      }}
                      title="Show all available links"
                      className="w-full sm:w-auto text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {showingLinksFor === upload.blobId ? 'Hide' : 'Show'}{' '}
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
                            onClick={() => onCopyUrl(upload.cdnUrl, 'cdn')}
                            className="text-xs"
                          >
                            {copiedUrl === 'cdn:' + upload.cdnUrl
                              ? '✓'
                              : 'Copy'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(upload.cdnUrl, '_blank')}
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
                              onCopyUrl(upload.directUrl, 'aggregator')
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
                            onClick={() => onCopyUrl(upload.blobId, 'blobId')}
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
  )
})
