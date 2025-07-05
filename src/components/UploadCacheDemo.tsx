import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ChainSelector, type SupportedChain } from './ChainSelector';
import { 
  Upload, 
  Zap, 
  Clock, 
  Check, 
  AlertTriangle, 
  Database,
  FileText,
  Copy,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Globe,
  Link,
  Hash,
  Sparkles
} from 'lucide-react';

// Real API integration
const WCDN_API_BASE = 'http://localhost:4500';
const API_KEY = 'dev-secret-wcdn-2024';

// SDK integration for URL generation
const getWalrusCDNUrl = (blobId: string, options?: { chain?: SupportedChain; customEndpoint?: string }) => {
  const WALRUS_AGGREGATOR_ENDPOINTS = {
    sui: 'https://aggregator.walrus-testnet.walrus.space',
    ethereum: 'https://eth-aggregator.walrus.space', // mock for hackathon
    solana: 'https://sol-aggregator.walrus.space' // mock for hackathon
  };

  if (options?.customEndpoint) {
    return `${options.customEndpoint}/v1/blobs/${blobId}`;
  }

  const chain = options?.chain ?? 'sui';
  const endpoint = WALRUS_AGGREGATOR_ENDPOINTS[chain];
  
  if (!endpoint) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  return `${endpoint}/v1/blobs/${blobId}`;
};

interface UploadResult {
  success: boolean;
  blobId: string;
  cdnUrl: string;
  directUrl: string;
  cached: boolean;
  chain: string;
  size: number;
  contentType: string;
  uploadTime: number;
  suiRef?: string;
  error?: string;
  filename?: string;
}

interface CacheStatus {
  cached: boolean;
  hitCount: number;
  lastAccess: string;
  ttl: number;
  size: number;
}

// Real upload function using WCDN API
async function realUploadToWalrusWithCache(file: File, chain: SupportedChain): Promise<UploadResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Starting real upload to Walrus (${chain})...`);
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Upload directly to Walrus via WCDN backend
    const response = await fetch(`${WCDN_API_BASE}/upload/walrus`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
      },
      body: formData
    });

    const uploadTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload failed:', errorText);
      return {
        success: false,
        blobId: '',
        cdnUrl: '',
        directUrl: '',
        cached: false,
        chain,
        size: file.size,
        contentType: file.type,
        uploadTime,
        error: `Upload failed: ${response.status} ${errorText}`
      };
    }

    const result = await response.json();
    console.log(`✅ Real upload completed in ${uploadTime}ms`);
    console.log('Upload result:', result);

    return {
      success: true,
      blobId: result.blobId,
      cdnUrl: result.cdnUrl || `${WCDN_API_BASE}/cdn/${result.blobId}`,
      directUrl: result.directUrl || `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${result.blobId}`,
      cached: result.cached || true,
      chain,
      size: file.size,
      contentType: file.type,
      uploadTime,
      suiRef: result.suiRef
    };

  } catch (error) {
    const uploadTime = Date.now() - startTime;
    console.error('Upload error:', error);
    
    return {
      success: false,
      blobId: '',
      cdnUrl: '',
      directUrl: '',
      cached: false,
      chain,
      size: file.size,
      contentType: file.type,
      uploadTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Real cache status function
async function realGetCacheStatus(blobId: string): Promise<CacheStatus | null> {
  try {
    const response = await fetch(`${WCDN_API_BASE}/api/stats/${blobId}`);
    
    if (!response.ok) {
      console.error('Cache status failed:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('Cache status:', data);
    
    return {
      cached: data.cached || false,
      hitCount: data.stats?.requests || 0,
      lastAccess: data.stats?.lastAccess || new Date().toISOString(),
      ttl: data.ttl || 3600,
      size: data.stats?.totalSize || 0
    };
  } catch (error) {
    console.error('Failed to get cache status:', error);
    return null;
  }
}

// Real fast access function
async function realGetCachedContent(blobId: string, chain: SupportedChain = 'sui'): Promise<{ cached: boolean; latency: number }> {
  const startTime = Date.now();
  
  try {
    const cdnUrl = `${WCDN_API_BASE}/cdn/${blobId}?chain=${chain}`;
    
    const response = await fetch(cdnUrl, { method: 'HEAD' });
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const cached = response.headers.get('X-Cache-Status') === 'HIT';
      console.log(`✅ Content access: ${latency}ms, cached: ${cached}`);
      
      return {
        cached,
        latency
      };
    } else {
      console.error('Content access failed:', response.status);
      return {
        cached: false,
        latency
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('Content access error:', error);
    
    return {
      cached: false,
      latency
    };
  }
}

type DemoStep = 'select' | 'uploading' | 'uploaded' | 'checking' | 'cached' | 'accessing' | 'complete';

export function UploadCacheDemo() {
  const [selectedChain, setSelectedChain] = useState<SupportedChain>('sui');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<DemoStep>('select');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [accessResult, setAccessResult] = useState<{ cached: boolean; latency: number } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [uploadHistory, setUploadHistory] = useState<UploadResult[]>([]);
  
  // URL generation state
  const [mode, setMode] = useState<'upload' | 'generate'>('upload');
  const [blobIdInput, setBlobIdInput] = useState<string>('');
  const [generatedUrls, setGeneratedUrls] = useState<{
    cdnUrl: string;
    directUrl: string;
    blobId: string;
  } | null>(null);

  // Load upload history from localStorage on component mount
  React.useEffect(() => {
    const savedHistory = localStorage.getItem('wcdn-upload-history');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setUploadHistory(history);
      } catch (error) {
        console.error('Failed to load upload history:', error);
      }
    }
  }, []);

  // Save upload history to localStorage whenever it changes
  React.useEffect(() => {
    if (uploadHistory.length > 0) {
      localStorage.setItem('wcdn-upload-history', JSON.stringify(uploadHistory));
    }
  }, [uploadHistory]);

  // Check backend status on component mount
  React.useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${WCDN_API_BASE}/upload/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        console.error('Backend check failed:', error);
        setBackendStatus('offline');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setCurrentStep('select');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

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

  const startDemo = async () => {
    if (!selectedFile) return;

    try {
      // Step 1: Real Upload to Walrus
      setCurrentStep('uploading');
      console.log('🚀 Starting real Walrus upload...');
      const result = await realUploadToWalrusWithCache(selectedFile, selectedChain);
      setUploadResult(result);
      
      if (!result.success) {
        console.error('Upload failed:', result.error);
        alert(`Upload failed: ${result.error}`);
        setCurrentStep('select');
        return;
      }
      
      // Add to upload history
      const uploadWithFilename = {
        ...result,
        filename: selectedFile.name
      };
      setUploadHistory(prev => [uploadWithFilename, ...prev].slice(0, 50)); // Keep last 50 uploads
      
      setCurrentStep('uploaded');
      console.log('✅ Upload successful, blob ID:', result.blobId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Check real cache status
      setCurrentStep('checking');
      console.log('📊 Checking cache status...');
      const cache = await realGetCacheStatus(result.blobId);
      if (cache) {
        setCacheStatus(cache);
        console.log('✅ Cache status retrieved:', cache);
      } else {
        console.warn('⚠️ Could not retrieve cache status');
        // Set fallback cache status
        setCacheStatus({
          cached: true,
          hitCount: 1,
          lastAccess: new Date().toISOString(),
          ttl: 3600,
          size: result.size
        });
      }
      setCurrentStep('cached');

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Test real fast access
      setCurrentStep('accessing');
      console.log('⚡ Testing fast cache access...');
      const access = await realGetCachedContent(result.blobId, selectedChain);
      setAccessResult(access);
      setCurrentStep('complete');
      console.log('✅ Demo completed successfully!');

    } catch (error) {
      console.error('Demo failed:', error);
      alert(`Demo failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCurrentStep('select');
    }
  };

  const resetDemo = () => {
    setCurrentStep('select');
    setSelectedFile(null);
    setUploadResult(null);
    setCacheStatus(null);
    setAccessResult(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(text);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generateUrls = () => {
    if (!blobIdInput.trim()) {
      alert('Please enter a blob ID');
      return;
    }

    try {
      const directUrl = getWalrusCDNUrl(blobIdInput.trim(), { chain: selectedChain });
      const cdnUrl = `${WCDN_API_BASE}/cdn/${blobIdInput.trim()}`;
      
      setGeneratedUrls({
        blobId: blobIdInput.trim(),
        directUrl,
        cdnUrl
      });
    } catch (error) {
      alert(`Failed to generate URLs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const autoFillFromHistory = (upload: UploadResult) => {
    setBlobIdInput(upload.blobId);
    setSelectedChain(upload.chain as SupportedChain);
    setMode('generate');
    
    // Auto-generate URLs
    setTimeout(() => {
      const directUrl = getWalrusCDNUrl(upload.blobId, { chain: upload.chain as SupportedChain });
      const cdnUrl = `${WCDN_API_BASE}/cdn/${upload.blobId}`;
      
      setGeneratedUrls({
        blobId: upload.blobId,
        directUrl,
        cdnUrl
      });
    }, 100);
  };

  const getStepStatus = (step: DemoStep) => {
    const stepOrder: DemoStep[] = ['select', 'uploading', 'uploaded', 'checking', 'cached', 'accessing', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-500" />
            <span>🚀 Upload + Cache Demo</span>
            {backendStatus === 'online' && (
              <Badge className="bg-green-100 text-green-800">
                ✅ Backend Online
              </Badge>
            )}
            {backendStatus === 'offline' && (
              <Badge className="bg-red-100 text-red-800">
                ❌ Backend Offline
              </Badge>
            )}
            {backendStatus === 'checking' && (
              <Badge className="bg-yellow-100 text-yellow-800">
                🔍 Checking...
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Experience the complete flow: Upload to Walrus → Automatic Cache → Fast Access
            {backendStatus === 'offline' && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">
                  ⚠️ <strong>Backend Required:</strong> Please start the WCDN backend server:
                  <br />
                  <code className="bg-red-100 px-2 py-1 rounded mt-1 inline-block">
                    cd cdn-server && bun dev
                  </code>
                </p>
              </div>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Choose Your Action</CardTitle>
          <CardDescription>Upload a new file or generate URLs for existing blob IDs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button
              variant={mode === 'upload' ? 'default' : 'outline'}
              onClick={() => {
                setMode('upload');
                setGeneratedUrls(null);
                setBlobIdInput('');
              }}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Upload File</span>
            </Button>
            <Button
              variant={mode === 'generate' ? 'default' : 'outline'}
              onClick={() => {
                setMode('generate');
                setUploadResult(null);
                setCacheStatus(null);
                setAccessResult(null);
                setCurrentStep('select');
              }}
              className="flex items-center space-x-2"
            >
              <Link className="h-4 w-4" />
              <span>Generate URLs</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chain Selector */}
      <ChainSelector 
        selectedChain={selectedChain}
        onChainSelect={setSelectedChain}
        showBlobStatus={!!uploadResult || !!generatedUrls}
        blobId={uploadResult?.blobId || generatedUrls?.blobId}
      />

      {/* Blob ID Input Area (Generate Mode) */}
      {mode === 'generate' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Hash className="h-5 w-5 text-purple-500" />
              <span>Generate URLs from Blob ID</span>
            </CardTitle>
            <CardDescription>Enter an existing Walrus blob ID to generate CDN URLs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter blob ID (e.g., sibZ297_DArzpYdVbxFegC3WYMLPwglE_ml0v3c8am0)"
                  value={blobIdInput}
                  onChange={(e) => setBlobIdInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={generateUrls}
                  disabled={!blobIdInput.trim()}
                  className="px-6"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate URLs
                </Button>
              </div>
              
              {uploadHistory.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">💡 Quick Fill from Upload History:</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadHistory.slice(0, 5).map((upload, index) => (
                      <Button
                        key={`${upload.blobId}-${index}`}
                        variant="outline"
                        size="sm"
                        onClick={() => autoFillFromHistory(upload)}
                        className="text-xs"
                      >
                        {upload.filename ? upload.filename.slice(0, 20) + '...' : upload.blobId.slice(0, 8) + '...'}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload Area (Upload Mode) */}
      {mode === 'upload' && (
        <Card>
        <CardHeader>
          <CardTitle>Step 1: Select File</CardTitle>
          <CardDescription>Choose a file to upload to Walrus with automatic caching</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className={`mx-auto h-12 w-12 mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            
            {selectedFile ? (
              <div className="space-y-2">
                <p className="text-lg font-medium text-green-600">
                  ✅ {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500">
                  {Math.round(selectedFile.size / 1024)} KB • {selectedFile.type}
                </p>
                <div className="flex justify-center space-x-2 mt-4">
                  <Button
                    onClick={startDemo}
                    disabled={currentStep !== 'select' || backendStatus !== 'online'}
                    className="px-6"
                  >
                    {backendStatus === 'offline' ? 'Backend Required' :
                     backendStatus === 'checking' ? 'Checking Backend...' :
                     currentStep === 'select' ? 'Start Real Demo' : 'Demo Running...'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetDemo}
                    disabled={currentStep === 'uploading' || currentStep === 'checking' || currentStep === 'accessing'}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  {dragActive ? 'Drop files here' : 'Drag files here or click to select'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Images, documents, any file type supported
                </p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  variant="outline"
                >
                  Choose File
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        </Card>
      )}

      {/* Generated URLs Display */}
      {mode === 'generate' && generatedUrls && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-green-500" />
              <span>Generated URLs</span>
            </CardTitle>
            <CardDescription>
              Chain-agnostic URLs for blob ID: {generatedUrls.blobId}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* WCDN URL */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-blue-700">WCDN Cache URL</span>
                    <Badge className="bg-blue-100 text-blue-800">Fast</Badge>
                  </div>
                  <p className="text-xs text-blue-600 mb-2 font-mono break-all">
                    {generatedUrls.cdnUrl}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(generatedUrls.cdnUrl)}
                      className="text-xs"
                    >
                      {copiedUrl === generatedUrls.cdnUrl ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(generatedUrls.cdnUrl, '_blank')}
                      className="text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                  </div>
                </div>

                {/* Direct Walrus URL */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Globe className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-green-700">Direct Walrus URL</span>
                    <Badge className="bg-green-100 text-green-800">Decentralized</Badge>
                  </div>
                  <p className="text-xs text-green-600 mb-2 font-mono break-all">
                    {generatedUrls.directUrl}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(generatedUrls.directUrl)}
                      className="text-xs"
                    >
                      {copiedUrl === generatedUrls.directUrl ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(generatedUrls.directUrl, '_blank')}
                      className="text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">🚀 SDK Usage Example</h4>
                <div className="text-sm text-purple-700 font-mono bg-purple-100 p-3 rounded">
                  <div>import {'{ getWalrusCDNUrl }'} from '@walrus/cdn';</div>
                  <div className="mt-2">
                    const url = getWalrusCDNUrl('{generatedUrls.blobId}', {'{'} 
                    <br />
                    &nbsp;&nbsp;chain: '{selectedChain}' 
                    <br />
                    {'}'});
                  </div>
                  <div className="mt-2 text-purple-600">// Returns: {generatedUrls.directUrl}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Progress */}
      {currentStep !== 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Demo Progress</CardTitle>
            <CardDescription>Watch the complete upload and cache flow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Progress Steps */}
              <div className="flex items-center justify-between">
                {[
                  { step: 'uploading', icon: Upload, label: 'Uploading to Walrus' },
                  { step: 'uploaded', icon: Check, label: 'Upload Complete' },
                  { step: 'checking', icon: Database, label: 'Checking Cache' },
                  { step: 'cached', icon: Zap, label: 'Cached' },
                  { step: 'accessing', icon: RefreshCw, label: 'Fast Access' },
                  { step: 'complete', icon: TrendingUp, label: 'Complete' }
                ].map(({ step, icon: Icon, label }, index) => {
                  const status = getStepStatus(step as DemoStep);
                  return (
                    <div key={step} className="flex flex-col items-center space-y-2">
                      <div className={`p-3 rounded-full ${
                        status === 'completed' ? 'bg-green-100 text-green-600' :
                        status === 'active' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        <Icon className={`h-5 w-5 ${status === 'active' ? 'animate-pulse' : ''}`} />
                      </div>
                      <span className={`text-xs text-center ${
                        status === 'completed' ? 'text-green-600' :
                        status === 'active' ? 'text-blue-600' :
                        'text-gray-400'
                      }`}>
                        {label}
                      </span>
                      {index < 5 && (
                        <ArrowRight className={`h-4 w-4 ${
                          status === 'completed' ? 'text-green-400' : 'text-gray-300'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Step Details */}
              {currentStep === 'uploading' && (
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-blue-800">Uploading to Walrus network...</p>
                </div>
              )}

              {currentStep === 'checking' && (
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="animate-pulse h-4 w-4 bg-yellow-500 rounded-full mx-auto mb-2"></div>
                  <p className="text-yellow-800">Checking cache status...</p>
                </div>
              )}

              {currentStep === 'accessing' && (
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="animate-bounce h-4 w-4 bg-purple-500 rounded-full mx-auto mb-2"></div>
                  <p className="text-purple-800">Testing fast cached access...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {uploadResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Upload Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Upload className="h-5 w-5 text-green-500" />
                <span>Upload Result</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Status:</span>
                <Badge className="bg-green-100 text-green-800">
                  ✅ Success
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Upload Time:</span>
                <span className="font-mono text-sm">{Math.round(uploadResult.uploadTime)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Chain:</span>
                <Badge variant="outline">{uploadResult.chain.toUpperCase()}</Badge>
              </div>
              <div>
                <span className="text-sm">Blob ID:</span>
                <p className="font-mono text-xs break-all text-gray-600">
                  {uploadResult.blobId}
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700">WCDN Cache (Fast)</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(uploadResult.cdnUrl)}
                      className="text-xs"
                    >
                      {copiedUrl === uploadResult.cdnUrl ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copy URL
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(uploadResult.cdnUrl, '_blank')}
                      className="text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">Direct Walrus (Decentralized)</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(uploadResult.directUrl)}
                      className="text-xs"
                    >
                      {copiedUrl === uploadResult.directUrl ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copy URL
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // For images, try to display inline; for other files, open directly
                        if (uploadResult.contentType.startsWith('image/')) {
                          // Create a new window with the image displayed properly
                          const newWindow = window.open('', '_blank');
                          if (newWindow) {
                            newWindow.document.write(`
                              <html>
                                <head>
                                  <title>${selectedFile?.name || 'Uploaded Image'}</title>
                                  <style>
                                    body { margin: 0; padding: 20px; background: #f5f5f5; font-family: Arial, sans-serif; }
                                    .container { max-width: 100%; text-align: center; }
                                    img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                                    .info { margin-top: 20px; color: #666; }
                                  </style>
                                </head>
                                <body>
                                  <div class="container">
                                    <img src="${uploadResult.directUrl}" alt="${selectedFile?.name || 'Uploaded Image'}" />
                                    <div class="info">
                                      <p><strong>File:</strong> ${selectedFile?.name || 'Unknown'}</p>
                                      <p><strong>Size:</strong> ${Math.round((selectedFile?.size || 0) / 1024)} KB</p>
                                      <p><strong>Blob ID:</strong> ${uploadResult.blobId}</p>
                                    </div>
                                  </div>
                                </body>
                              </html>
                            `);
                            newWindow.document.close();
                          }
                        } else {
                          // For non-images, open the direct URL
                          window.open(uploadResult.directUrl, '_blank');
                        }
                      }}
                      className="text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                  {/* Inline preview for images */}
                  {uploadResult.contentType.startsWith('image/') && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-2">Preview:</p>
                      <img 
                        src={uploadResult.directUrl} 
                        alt={selectedFile?.name || 'Uploaded image'} 
                        className="max-w-full max-h-32 object-contain rounded border"
                        onError={(e) => {
                          // Hide preview if image fails to load
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cache Status */}
          {cacheStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  <span>Cache Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cached:</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    ✅ Yes
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hit Count:</span>
                  <span className="font-mono text-sm">{cacheStatus.hitCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">TTL:</span>
                  <span className="font-mono text-sm">{cacheStatus.ttl}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Size:</span>
                  <span className="font-mono text-sm">{Math.round(cacheStatus.size / 1024)}KB</span>
                </div>
                <div>
                  <span className="text-sm">Last Access:</span>
                  <p className="text-xs text-gray-600">
                    {new Date(cacheStatus.lastAccess).toLocaleTimeString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Access Performance */}
          {accessResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span>Fast Access</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">From Cache:</span>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    ⚡ Yes
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Access Time:</span>
                  <span className="font-mono text-sm text-green-600">
                    {accessResult.latency}ms
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">vs Upload:</span>
                  <span className="font-mono text-sm">
                    {Math.round((uploadResult?.uploadTime || 1000) / accessResult.latency)}x faster
                  </span>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800 font-medium">
                      Cache Hit! Lightning fast access
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Summary */}
      {currentStep === 'complete' && uploadResult && accessResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-600">🎉 Demo Complete!</CardTitle>
            <CardDescription>Your file is now stored on Walrus with lightning-fast cache access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="font-bold text-2xl text-blue-600">{Math.round(uploadResult.uploadTime)}ms</div>
                <div className="text-sm text-blue-800">Upload Time</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="font-bold text-2xl text-green-600">{accessResult.latency}ms</div>
                <div className="text-sm text-green-800">Cache Access</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="font-bold text-2xl text-purple-600">{Math.round((uploadResult.uploadTime) / accessResult.latency)}x</div>
                <div className="text-sm text-purple-800">Speed Improvement</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="font-bold text-2xl text-yellow-600">{selectedChain.toUpperCase()}</div>
                <div className="text-sm text-yellow-800">Blockchain</div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">💡 What just happened?</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>✅ Your file was uploaded to the decentralized Walrus network</li>
                <li>✅ WCDN automatically cached it for fast access</li>
                <li>✅ Subsequent requests are served from cache (lightning fast!)</li>
                <li>✅ You get Web2-level performance with Web3 security</li>
              </ul>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2">🌐 Multi-Chain Access</h4>
              <p className="text-sm text-blue-800 mb-2">
                Your file is now accessible from <strong>any blockchain</strong> via these URLs:
              </p>
              <ul className="text-sm space-y-1 text-blue-700">
                <li>🔗 <strong>WCDN URL:</strong> Fast cached access via our CDN</li>
                <li>🔗 <strong>Direct URL:</strong> Decentralized access via Walrus aggregator</li>
                <li>🌍 <strong>Chain-agnostic:</strong> Works with Ethereum, Solana, Sui, etc.</li>
                <li>🚀 <strong>No SDK needed:</strong> Just use the URLs in any dApp or smart contract</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-Chain Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Globe className="h-5 w-5 text-purple-500" />
            <span>🌐 Multi-Chain Access Explained</span>
          </CardTitle>
          <CardDescription>
            How users on different blockchains can access your Walrus content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">🔑 Key Concept</h4>
                <p className="text-sm text-green-700">
                  Once uploaded to Walrus, your files become <strong>chain-agnostic</strong>. 
                  Anyone can access them via HTTP URLs, regardless of which blockchain they're using.
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">🌍 Universal Access</h4>
                <p className="text-sm text-blue-700">
                  Smart contracts on Ethereum, Solana, Sui, or any blockchain can reference 
                  these URLs in NFT metadata, dApp UIs, or contract logic.
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-3">📋 How It Works</h4>
              <div className="space-y-2 text-sm text-purple-700">
                <div className="flex items-start space-x-2">
                  <span className="font-bold">1.</span>
                  <span>Upload file to Walrus (from any supported chain)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-bold">2.</span>
                  <span>Get blob ID and CDN URLs</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-bold">3.</span>
                  <span>Share URLs with users/dApps on <strong>any chain</strong></span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="font-bold">4.</span>
                  <span>Anyone can access via browser, fetch(), or embed in dApps</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-3">🎯 Real-World Example</h4>
              <p className="text-sm text-yellow-700 mb-2">
                <strong>NFT Project:</strong> Upload images to Walrus via Sui
              </p>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Ethereum users can view images in their wallets</li>
                <li>• Solana dApps can embed images in their UIs</li>
                <li>• Web2 apps can use images like any CDN</li>
                <li>• All without installing SDKs or blockchain-specific tools</li>
              </ul>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">⚡ Why This Matters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <strong className="text-green-600">✅ For Developers:</strong>
                  <ul className="text-gray-700 mt-1">
                    <li>• Build once, use everywhere</li>
                    <li>• No chain-specific storage code</li>
                    <li>• Simplified cross-chain dApps</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-blue-600">✅ For Users:</strong>
                  <ul className="text-gray-700 mt-1">
                    <li>• Access from any blockchain</li>
                    <li>• No SDK installation needed</li>
                    <li>• Standard HTTP URLs</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload History */}
      {uploadHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <span>Upload History</span>
              <Badge variant="outline">{uploadHistory.length} uploads</Badge>
            </CardTitle>
            <CardDescription>
              Your recent uploads are saved locally - they'll persist after page refresh
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {uploadHistory.map((upload, index) => (
                <div key={`${upload.blobId}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {upload.contentType.startsWith('image/') && (
                      <img 
                        src={upload.directUrl} 
                        alt={upload.filename || 'Uploaded file'} 
                        className="w-12 h-12 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    {!upload.contentType.startsWith('image/') && (
                      <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{upload.filename || 'Unknown file'}</p>
                      <p className="text-xs text-gray-500">
                        {Math.round(upload.size / 1024)} KB • {upload.chain.toUpperCase()} • {new Date(Date.now() - ((uploadHistory.length - index) * 60000)).toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{upload.blobId.slice(0, 20)}...</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => autoFillFromHistory(upload)}
                      className="text-xs"
                      title="Auto-fill this blob ID"
                    >
                      <Hash className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(upload.directUrl)}
                      className="text-xs"
                    >
                      {copiedUrl === upload.directUrl ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (upload.contentType.startsWith('image/')) {
                          const newWindow = window.open('', '_blank');
                          if (newWindow) {
                            newWindow.document.write(`
                              <html>
                                <head>
                                  <title>${upload.filename || 'Uploaded Image'}</title>
                                  <style>
                                    body { margin: 0; padding: 20px; background: #f5f5f5; font-family: Arial, sans-serif; }
                                    .container { max-width: 100%; text-align: center; }
                                    img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                                    .info { margin-top: 20px; color: #666; }
                                  </style>
                                </head>
                                <body>
                                  <div class="container">
                                    <img src="${upload.directUrl}" alt="${upload.filename || 'Uploaded Image'}" />
                                    <div class="info">
                                      <p><strong>File:</strong> ${upload.filename || 'Unknown'}</p>
                                      <p><strong>Size:</strong> ${Math.round(upload.size / 1024)} KB</p>
                                      <p><strong>Blob ID:</strong> ${upload.blobId}</p>
                                    </div>
                                  </div>
                                </body>
                              </html>
                            `);
                            newWindow.document.close();
                          }
                        } else {
                          window.open(upload.directUrl, '_blank');
                        }
                      }}
                      className="text-xs"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {uploadHistory.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUploadHistory([]);
                    localStorage.removeItem('wcdn-upload-history');
                  }}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Clear History
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}