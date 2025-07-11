import React, { useState } from 'react'
import { Shield, CheckCircle, XCircle, Key } from 'lucide-react'
import { useWalcache, SupportedChain } from '../contexts/WalcacheContext'
import ResultCard from '../components/ResultCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function AssetVerification() {
  const { verifyOwnership, loading } = useWalcache()
  const [userAddress, setUserAddress] = useState('0x1234567890123456789012345678901234567890')
  const [assetId, setAssetId] = useState('123')
  const [chain, setChain] = useState<SupportedChain>('ethereum')
  const [result, setResult] = useState<any>(null)

  const handleVerify = async () => {
    if (!userAddress.trim() || !assetId.trim()) return

    const response = await verifyOwnership({
      userAddress: userAddress.trim(),
      assetId: assetId.trim(),
      chain,
    })
    setResult(response)
  }

  const getChainColor = (chainName: string) => {
    const colors: Record<string, string> = {
      ethereum: 'bg-blue-100 text-blue-800 border-blue-200',
      sui: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      solana: 'bg-purple-100 text-purple-800 border-purple-200',
    }
    return colors[chainName] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Asset Ownership Verification
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Verification Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Wallet Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="0x123..."
                className="input-field font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                The wallet address to verify ownership for
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset/Token ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="123"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                The asset or token ID to check ownership for
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blockchain Network <span className="text-red-500">*</span>
              </label>
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value as SupportedChain)}
                className="input-field"
              >
                <option value="ethereum">Ethereum</option>
                <option value="sui">Sui</option>
                <option value="solana">Solana</option>
              </select>
            </div>

            <button
              onClick={handleVerify}
              disabled={!userAddress.trim() || !assetId.trim() || loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <LoadingSpinner size="sm" text="Verifying..." />
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Verify Ownership
                </>
              )}
            </button>
          </div>

          {/* Verification Info */}
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Key className="w-4 h-4" />
                How Verification Works
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. SDK queries the blockchain for asset ownership</li>
                <li>2. Checks if the wallet address owns the specified asset</li>
                <li>3. Returns verification result with metadata</li>
                <li>4. Can be used for gated content access</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-medium text-yellow-800 mb-2">💡 Use Cases</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Token-gated content access</li>
                <li>• NFT membership verification</li>
                <li>• Premium feature unlocking</li>
                <li>• Community access control</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">✅ Benefits</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Cross-chain compatibility</li>
                <li>• Real-time verification</li>
                <li>• Metadata enrichment</li>
                <li>• Standardized API</li>
              </ul>
            </div>
          </div>
        </div>

        {result && (
          <div className="space-y-4">
            {result.success ? (
              <ResultCard 
                type={result.data.hasAccess ? "success" : "error"} 
                title={result.data.hasAccess ? "✅ Ownership Verified" : "❌ Ownership Not Verified"}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">Verification Details</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Status:</strong>{' '}
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          result.data.hasAccess 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.data.hasAccess ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Verified
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Not Verified
                            </>
                          )}
                        </span>
                      </p>
                      <p>
                        <strong>Chain:</strong>{' '}
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getChainColor(result.data.chain)}`}>
                          {result.data.chain.charAt(0).toUpperCase() + result.data.chain.slice(1)}
                        </span>
                      </p>
                      <p>
                        <strong>Verified At:</strong>{' '}
                        <span className="font-mono text-xs">
                          {new Date(result.data.verifiedAt).toLocaleString()}
                        </span>
                      </p>
                      <p>
                        <strong>User Address:</strong>{' '}
                        <code className="text-xs bg-white px-2 py-1 rounded break-all">
                          {userAddress}
                        </code>
                      </p>
                      <p>
                        <strong>Asset ID:</strong>{' '}
                        <code className="text-xs bg-white px-2 py-1 rounded">
                          {assetId}
                        </code>
                      </p>
                    </div>
                  </div>

                  {result.data.assetMetadata && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800">Asset Metadata</h4>
                      <div className="space-y-2 text-sm">
                        {result.data.assetMetadata.name && (
                          <p>
                            <strong>Name:</strong> {result.data.assetMetadata.name}
                          </p>
                        )}
                        {result.data.assetMetadata.description && (
                          <p>
                            <strong>Description:</strong> {result.data.assetMetadata.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {result.data.hasAccess && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">🎉 Access Granted!</h4>
                    <p className="text-sm text-green-700">
                      This user has verified ownership and can access gated content or features.
                    </p>
                  </div>
                )}
              </ResultCard>
            ) : (
              <ResultCard type="error" title="Verification Failed">
                <p>{result.error}</p>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 Troubleshooting:</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
                    <li>Verify the wallet address format is correct for the selected chain</li>
                    <li>Make sure the asset/token ID exists on the blockchain</li>
                    <li>Check if your backend server is running and accessible</li>
                    <li>Ensure the blockchain network is properly configured</li>
                  </ul>
                </div>
              </ResultCard>
            )}
          </div>
        )}
      </div>

      {/* Sample Data */}
      <div className="card p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Test with Sample Data</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => {
              setUserAddress('0x1234567890123456789012345678901234567890')
              setAssetId('123')
              setChain('ethereum')
            }}
            className="p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors text-left"
          >
            <h4 className="font-medium text-gray-800">Ethereum NFT Owner</h4>
            <p className="text-sm text-gray-600 mt-1">Sample Ethereum address with token ID 123</p>
          </button>
          
          <button
            onClick={() => {
              setUserAddress('0x9999999999999999999999999999999999999999')
              setAssetId('456')
              setChain('sui')
            }}
            className="p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors text-left"
          >
            <h4 className="font-medium text-gray-800">Sui Asset Owner</h4>
            <p className="text-sm text-gray-600 mt-1">Sample Sui address with asset ID 456</p>
          </button>
        </div>
      </div>

      {/* Integration Example */}
      <div className="card p-6 bg-indigo-50 border-indigo-200">
        <h3 className="text-lg font-semibold text-indigo-800 mb-4">💻 Integration Example</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">
{`// Backend integration example
app.post('/verify-access', async (req, res) => {
  const { userAddress, assetId, chain } = req.body
  
  const verification = await walcache.verifyOwnership({
    userAddress,
    assetId,
    chain
  })
  
  if (verification.data.hasAccess) {
    // Grant access to premium content
    res.json({ 
      access: true, 
      content: await getPremiumContent() 
    })
  } else {
    res.status(403).json({ 
      access: false, 
      message: 'NFT ownership required' 
    })
  }
})`}
          </pre>
        </div>
      </div>
    </div>
  )
}