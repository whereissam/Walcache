import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, CheckCircle } from 'lucide-react'
import { useWalcache } from '../contexts/WalcacheContext'
import ChainSelector from '../components/ChainSelector'
import ResultCard from '../components/ResultCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function UploadAsset() {
  const { selectedChain, uploadAsset, loading } = useWalcache()
  const [files, setFiles] = useState<File[]>([])
  const [assetName, setAssetName] = useState('')
  const [description, setDescription] = useState('')
  const [createNFT, setCreateNFT] = useState(false)
  const [permanent, setPermanent] = useState(true)
  const [uploadResults, setUploadResults] = useState<any[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploadResults([])
    const results = []

    for (const file of files) {
      try {
        const result = await uploadAsset(file, {
          chain: selectedChain,
          name: assetName || file.name,
          description,
          createNFT,
          permanent,
        })
        results.push({ file: file.name, ...result })
      } catch (error: any) {
        results.push({ 
          file: file.name, 
          success: false, 
          error: error.message 
        })
      }
    }

    setUploadResults(results)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Upload className="w-6 h-6" />
          Upload Assets to Blockchain
        </h2>

        {/* Chain Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Blockchain
          </label>
          <ChainSelector />
        </div>

        {/* File Upload Area */}
        <div
          {...getRootProps()}
          className={`upload-area mb-6 ${isDragActive ? 'dragover' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg text-primary-600">Drop files here...</p>
            ) : (
              <div>
                <p className="text-lg text-gray-600 mb-2">
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports all file types • Multiple files allowed
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Selected Files ({files.length})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <File className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Options */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset Name (optional)
            </label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="Enter asset name"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your asset"
              className="input-field"
            />
          </div>
        </div>

        <div className="flex gap-6 mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={createNFT}
              onChange={(e) => setCreateNFT(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Create as NFT</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={permanent}
              onChange={(e) => setPermanent(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Permanent Storage</span>
          </label>
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || loading}
          className="btn-primary w-full md:w-auto"
        >
          {loading ? (
            <LoadingSpinner size="sm" text="Uploading..." />
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload to {selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1)}
            </>
          )}
        </button>
      </div>

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <div className="space-y-4">
          {uploadResults.map((result, index) => (
            <div key={index}>
              {result.success ? (
                <ResultCard type="success" title={`✅ ${result.file} - Upload Successful`}>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Asset ID:</strong> <code className="bg-white px-2 py-1 rounded">{result.data?.id}</code></p>
                      <p><strong>Chain:</strong> {result.data?.chain}</p>
                      {result.data?.transactionHash && (
                        <p><strong>Transaction:</strong> <code className="bg-white px-2 py-1 rounded">{result.data.transactionHash}</code></p>
                      )}
                    </div>
                    <div>
                      {result.data?.contractAddress && (
                        <p><strong>NFT Contract:</strong> <code className="bg-white px-2 py-1 rounded">{result.data.contractAddress}</code></p>
                      )}
                      {result.data?.tokenId && (
                        <p><strong>Token ID:</strong> {result.data.tokenId}</p>
                      )}
                      <p><strong>CDN URL:</strong> <a href={result.data?.cdnUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Asset</a></p>
                    </div>
                  </div>
                </ResultCard>
              ) : (
                <ResultCard type="error" title={`❌ ${result.file} - Upload Failed`}>
                  <p>{result.error}</p>
                </ResultCard>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">💡 How It Works</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>1. <strong>Select Blockchain:</strong> Choose Ethereum, Sui, or Solana</p>
          <p>2. <strong>Upload Files:</strong> Drag & drop or click to select multiple files</p>
          <p>3. <strong>Configure Options:</strong> Set metadata and NFT creation preferences</p>
          <p>4. <strong>Submit:</strong> Files are uploaded to your selected blockchain via Walrus storage</p>
          <p className="mt-3 font-medium">🔄 <strong>Behind the scenes:</strong> Your React app → Your Backend API → Walcache SDK → Blockchain</p>
        </div>
      </div>
    </div>
  )
}