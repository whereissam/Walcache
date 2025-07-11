import React, { useState } from 'react'
import { Globe, Copy, ExternalLink, Settings } from 'lucide-react'
import { useWalcache } from '../contexts/WalcacheContext'
import ResultCard from '../components/ResultCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function MultiChainUrls() {
  const { generateUrls, loading } = useWalcache()
  const [blobId, setBlobId] = useState('bafkreihvzun3vxd2dxqhvhwdvwyx7vt7zwqhvhwdvwyx7vt7zwqhvhw')
  const [width, setWidth] = useState('')
  const [quality, setQuality] = useState('')
  const [format, setFormat] = useState('')
  const [result, setResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!blobId.trim()) return

    const params: Record<string, string> = {}
    if (width) params.width = width
    if (quality) params.quality = quality
    if (format) params.format = format

    const response = await generateUrls(blobId.trim(), params)
    setResult(response)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Globe className="w-6 h-6" />
          Multi-Chain CDN URL Generator
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Basic Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Basic Configuration
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blob ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={blobId}
                onChange={(e) => setBlobId(e.target.value)}
                placeholder="Enter blob ID"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Width (optional)
              </label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="e.g., 800"
                className="input-field"
                min="1"
                max="4096"
              />
              <p className="text-xs text-gray-500 mt-1">
                Resize images to specified width (1-4096px)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Quality (optional)
              </label>
              <input
                type="number"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                placeholder="e.g., 85"
                className="input-field"
                min="1"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Image quality percentage (1-100)
              </p>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Advanced Options</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output Format (optional)
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="input-field"
              >
                <option value="">Auto (original format)</option>
                <option value="webp">WebP (modern, efficient)</option>
                <option value="avif">AVIF (next-gen format)</option>
                <option value="jpg">JPEG (compatibility)</option>
                <option value="png">PNG (lossless)</option>
              </select>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">🚀 URL Optimization</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Automatic format selection for best performance</li>
                <li>• Global CDN distribution</li>
                <li>• Smart caching and compression</li>
                <li>• Chain-based routing optimization</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!blobId.trim() || loading}
          className="btn-primary"
        >
          {loading ? (
            <LoadingSpinner size="sm" text="Generating..." />
          ) : (
            <>
              <Globe className="w-4 h-4 mr-2" />
              Generate Optimized URLs
            </>
          )}
        </button>

        {result && (
          <div className="mt-6">
            {result.success ? (
              <ResultCard type="success" title="Optimized CDN URL Generated">
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-800">Optimized URL</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(result.cdnUrl)}
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                          title="Copy URL"
                        >
                          <Copy className="w-3 h-3" />
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                        <a
                          href={result.cdnUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </a>
                      </div>
                    </div>
                    <code className="block text-sm bg-gray-50 p-3 rounded border break-all">
                      {result.cdnUrl}
                    </code>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-2">🎯 URL Features:</p>
                    <ul className="space-y-1 ml-4">
                      <li>• Automatically optimized for user's blockchain and location</li>
                      <li>• Global CDN distribution for maximum performance</li>
                      <li>• Smart caching with edge servers worldwide</li>
                      <li>• Format conversion and compression applied</li>
                      {width && <li>• Resized to {width}px width</li>}
                      {quality && <li>• Quality optimized to {quality}%</li>}
                      {format && <li>• Converted to {format.toUpperCase()} format</li>}
                    </ul>
                  </div>

                  {/* Preview for images */}
                  {result.cdnUrl && (result.cdnUrl.includes('image') || width || quality || format) && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-800 mb-2">Preview</h4>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <img
                          src={result.cdnUrl}
                          alt="Asset preview"
                          className="max-w-full h-auto rounded"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </ResultCard>
            ) : (
              <ResultCard type="error" title="URL Generation Failed">
                <p>{result.error}</p>
              </ResultCard>
            )}
          </div>
        )}
      </div>

      {/* Multi-Chain Information */}
      <div className="card p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-800 mb-4">🌐 Multi-Chain URL Benefits</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-white rounded-lg border border-purple-100">
            <h4 className="font-medium text-purple-700 mb-2">⚡ Performance</h4>
            <p className="text-gray-600">
              URLs automatically route to the fastest available endpoint based on user location and blockchain.
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-blue-100">
            <h4 className="font-medium text-blue-700 mb-2">🔄 Redundancy</h4>
            <p className="text-gray-600">
              Fallback across multiple chains ensures 99.9% uptime and availability.
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-green-100">
            <h4 className="font-medium text-green-700 mb-2">💰 Cost Optimization</h4>
            <p className="text-gray-600">
              Smart routing selects the most cost-effective chain for each request.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Examples */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🛠 Quick Examples</h3>
        <div className="space-y-3">
          <button
            onClick={() => {
              setBlobId('bafkreihvzun3vxd2dxqhvhwdvwyx7vt7zwqhvhwdvwyx7vt7zwqhvhw')
              setWidth('400')
              setQuality('80')
              setFormat('webp')
            }}
            className="block w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors"
          >
            <div className="font-medium text-gray-800">Optimized Image</div>
            <div className="text-sm text-gray-600">400px width, 80% quality, WebP format</div>
          </button>
          
          <button
            onClick={() => {
              setBlobId('bafkreig6mzqvqsqqrwf6gw7qo7yklqng7ez2lxsb5vmvcwgbumz5qcpqxy')
              setWidth('800')
              setQuality('90')
              setFormat('')
            }}
            className="block w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors"
          >
            <div className="font-medium text-gray-800">High Quality Image</div>
            <div className="text-sm text-gray-600">800px width, 90% quality, auto format</div>
          </button>

          <button
            onClick={() => {
              setBlobId('bafkreihvzun3vxd2dxqhvhwdvwyx7vt7zwqhvhwdvwyx7vt7zwqhvhw')
              setWidth('')
              setQuality('')
              setFormat('')
            }}
            className="block w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors"
          >
            <div className="font-medium text-gray-800">Original File</div>
            <div className="text-sm text-gray-600">No modifications, original quality and format</div>
          </button>
        </div>
      </div>
    </div>
  )
}