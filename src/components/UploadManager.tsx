import { useState, useEffect, useCallback } from 'react';
import { useWCDNStore } from '../store/wcdnStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Upload, Plus, Trash2, ExternalLink, Copy, Check, AlertTriangle, Database } from 'lucide-react';
import { formatBytes, formatDate, truncateCID, truncateText } from '../lib/utils';

export function UploadManager() {
  const [selectedVault, setSelectedVault] = useState<string>('');
  const [newVaultName, setNewVaultName] = useState('');
  const [showCreateVault, setShowCreateVault] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

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
    deleteFile,
    setError
  } = useWCDNStore();

  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  useEffect(() => {
    if (selectedVault) {
      fetchFiles(selectedVault);
    }
  }, [selectedVault, fetchFiles]);

  const handleFileUpload = useCallback(async (fileList: FileList) => {
    if (fileList.length === 0) return;
    
    if (vaults.length === 0) {
      setError('Please create a vault first');
      return;
    }
    
    if (!selectedVault) {
      setError('Please select a vault before uploading');
      return;
    }

    const file = fileList[0];
    try {
      await uploadFile(file, selectedVault);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [selectedVault, vaults.length, uploadFile, setError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleCreateVault = async () => {
    if (!newVaultName.trim()) return;
    
    try {
      await createVault(newVaultName.trim());
      setNewVaultName('');
      setShowCreateVault(false);
    } catch (error) {
      console.error('Failed to create vault:', error);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      try {
        await deleteFile(fileId);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
  };

  const copyToClipboard = async (url: string, type: 'cdn' | 'blobId') => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(type + ':' + url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Upload Manager</h1>
        <p className="text-sm sm:text-base text-gray-600">Upload files to Walrus via Tusky.io and access them through WCDN</p>
      </div>

      {/* Vault Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Vault</CardTitle>
          <CardDescription>Choose a vault to upload files to, or create a new one</CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full">
            <div className="flex-1 min-w-0">
              <Select value={selectedVault} onValueChange={setSelectedVault} disabled={isLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoading ? "Loading vaults..." : "Select a vault..."} />
                </SelectTrigger>
                <SelectContent>
                  {vaults.length === 0 && !isLoading ? (
                    <SelectItem value="no-vaults" disabled>
                      No vaults available - create one first
                    </SelectItem>
                  ) : (
                    vaults.map((vault) => (
                      <SelectItem key={vault.id} value={vault.id}>
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4 text-gray-400" />
                          <span>{truncateText(vault.name, 30)} ({vault.filesCount || 0} files)</span>
                        </div>
                      </SelectItem>
                    ))
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
                <Button onClick={handleCreateVault} disabled={!newVaultName.trim()} className="w-full sm:w-auto">
                  Create
                </Button>
                <Button variant="outline" onClick={() => setShowCreateVault(false)} className="w-full sm:w-auto">
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
            Drag and drop files here or click to select. Files will be uploaded to Walrus and automatically cached.
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
            <Upload className={`mx-auto h-8 w-8 sm:h-12 sm:w-12 mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="text-base sm:text-lg font-medium mb-2">
              {dragActive ? 'Drop files here' : 'Upload to Walrus'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">
              Max file size: 100MB
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              disabled={!selectedVault && vaults.length === 0}
            />
            <Button 
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={!selectedVault && vaults.length === 0}
              className="w-full sm:w-auto"
            >
              Choose Files
            </Button>
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
                  {upload.status === 'uploading' && `${upload.progress}%`}
                  {upload.status === 'completed' && '✓ Completed'}
                  {upload.status === 'error' && '✗ Failed'}
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
            Files in {selectedVault ? vaults.find(v => v.id === selectedVault)?.name : 'all vaults'}
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
              {files.map((file) => (
                console.log(file),
                <div key={file.id} className="border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{file.name}</h3>
                      <div className="text-xs sm:text-sm text-gray-500 mt-1">
                        <span>{formatBytes(file.size)}</span>
                        <span className="mx-2">•</span>
                        <span>{formatDate(file.createdAt)}</span>
                        <span className="mx-2">•</span>
                        <span>Blob ID: {truncateCID(file.blobId)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Copy CDN URL */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(file.cdnUrl!, 'cdn')}
                        title="Copy CDN URL"
                      >
                        {copiedUrl === 'cdn:' + file.cdnUrl ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {/* Copy Blob ID */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(file.blobId, 'blobId')}
                        title="Copy Blob ID"
                      >
                        {copiedUrl === 'blobId:' + file.blobId ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>

                      {/* View File */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          // Try CDN URL first
                          try {
                            const response = await fetch(file.cdnUrl!);
                            if (response.ok) {
                              window.open(file.cdnUrl, '_blank');
                              return;
                            }
                          } catch (error) {
                            console.warn('CDN fetch failed:', error);
                          }
                          
                          // CDN failed, try download URL
                          if ((file as any).downloadUrl) {
                            try {
                              const downloadResponse = await fetch((file as any).downloadUrl);
                              if (downloadResponse.ok) {
                                window.open((file as any).downloadUrl, '_blank');
                                return;
                              }
                            } catch (error) {
                              console.warn('Download URL failed:', error);
                            }
                          }
                          
                          // Both failed, show error
                          alert(`File "${file.name}" is currently not accessible. The file is stored on the Walrus network but the network appears to be unavailable.`);
                        }}
                        title="View File"
                      >
                        <ExternalLink className="h-4 w-4" />
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card>
          <CardContent className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}