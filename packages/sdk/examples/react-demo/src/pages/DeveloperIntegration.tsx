import React, { useState } from 'react'
import { Code, Download, GitBranch, Terminal, Zap, Shield } from 'lucide-react'

const codeExamples = {
  installation: `# Install the SDK
npm install @walcache/sdk
# or
yarn add @walcache/sdk
# or
bun add @walcache/sdk`,

  backend: `// Backend integration (Node.js/Express)
import { WalcacheUseCases } from '@walcache/sdk'
import express from 'express'
import multer from 'multer'

const app = express()
const upload = multer({ dest: 'uploads/' })

// Initialize SDK
const walcache = new WalcacheUseCases({
  baseUrl: 'https://your-cdn-domain.com',
  apiKey: process.env.WALCACHE_API_KEY,
  defaultChain: 'sui'
})

// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const result = await walcache.uploadAsset(req.file, {
      chain: req.body.chain || 'sui',
      category: 'nft',
      createNFT: req.body.createNFT === 'true',
      owner: req.body.owner
    })
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Verification endpoint
app.post('/api/verify', async (req, res) => {
  const { userAddress, assetId, chain } = req.body
  
  const verification = await walcache.verifyOwnership({
    userAddress,
    assetId,
    chain
  })
  
  res.json(verification)
})

app.listen(3000, () => {
  console.log('Backend running on port 3000')
})`,

  frontend: `// Frontend integration (React)
import React, { useState } from 'react'

function AssetUploader() {
  const [file, setFile] = useState(null)
  const [chain, setChain] = useState('sui')
  const [loading, setLoading] = useState(false)

  const uploadAsset = async () => {
    if (!file) return
    
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('chain', chain)
    formData.append('createNFT', 'true')
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('Upload successful:', result.data)
        // Handle success (show success message, etc.)
      } else {
        console.error('Upload failed:', result.error)
      }
    } catch (error) {
      console.error('Network error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => setFile(e.target.files[0])} 
      />
      <select 
        value={chain} 
        onChange={(e) => setChain(e.target.value)}
      >
        <option value="sui">Sui</option>
        <option value="ethereum">Ethereum</option>
        <option value="solana">Solana</option>
      </select>
      <button 
        onClick={uploadAsset} 
        disabled={!file || loading}
      >
        {loading ? 'Uploading...' : 'Upload to Blockchain'}
      </button>
    </div>
  )
}

export default AssetUploader`,

  nextjs: `// Next.js API Route (pages/api/upload.js)
import { WalcacheUseCases } from '@walcache/sdk'
import formidable from 'formidable'

const walcache = new WalcacheUseCases({
  baseUrl: process.env.WALCACHE_BASE_URL,
  apiKey: process.env.WALCACHE_API_KEY
})

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const form = formidable()
  const [fields, files] = await form.parse(req)
  
  const file = files.file[0]
  const chain = fields.chain[0] || 'sui'
  
  try {
    const result = await walcache.uploadAsset(file, {
      chain,
      createNFT: fields.createNFT?.[0] === 'true'
    })
    
    res.status(200).json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}`,

  python: `# Python/Flask integration
from flask import Flask, request, jsonify
from walcache_sdk import WalcacheUseCases
import os

app = Flask(__name__)

# Initialize SDK
walcache = WalcacheUseCases(
    base_url=os.getenv('WALCACHE_BASE_URL'),
    api_key=os.getenv('WALCACHE_API_KEY'),
    default_chain='sui'
)

@app.route('/api/upload', methods=['POST'])
def upload_asset():
    try:
        file = request.files['file']
        chain = request.form.get('chain', 'sui')
        create_nft = request.form.get('createNFT') == 'true'
        
        result = walcache.upload_asset(file, {
            'chain': chain,
            'create_nft': create_nft
        })
        
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/verify', methods=['POST'])
def verify_ownership():
    data = request.get_json()
    
    verification = walcache.verify_ownership({
        'user_address': data['userAddress'],
        'asset_id': data['assetId'],
        'chain': data['chain']
    })
    
    return jsonify(verification)

if __name__ == '__main__':
    app.run(debug=True)`
}

const frameworks = [
  { name: 'Express.js', icon: '🟢', description: 'Node.js with Express framework' },
  { name: 'Next.js', icon: '⚡', description: 'React with API routes' },
  { name: 'Python Flask', icon: '🐍', description: 'Python web framework' },
  { name: 'Fastify', icon: '🚀', description: 'Fast Node.js framework' },
  { name: 'Django', icon: '🎸', description: 'Python Django framework' },
  { name: 'NestJS', icon: '🏠', description: 'Enterprise Node.js framework' },
]

export default function DeveloperIntegration() {
  const [activeTab, setActiveTab] = useState('installation')

  const tabs = [
    { id: 'installation', label: 'Installation', icon: Download },
    { id: 'backend', label: 'Backend Setup', icon: Terminal },
    { id: 'frontend', label: 'Frontend Usage', icon: Code },
    { id: 'nextjs', label: 'Next.js API', icon: Zap },
    { id: 'python', label: 'Python Flask', icon: Shield },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Developer Integration Guide
        </h2>
        <p className="text-xl text-white opacity-90 mb-6 max-w-3xl mx-auto">
          Get started with Walcache SDK in minutes. Follow our step-by-step guide 
          to integrate multi-chain storage into your application.
        </p>
      </div>

      {/* Quick Start Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Download className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">1. Install SDK</h3>
          <p className="text-gray-600 text-sm">
            Add Walcache SDK to your backend project with npm, yarn, or bun
          </p>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">2. Setup Backend</h3>
          <p className="text-gray-600 text-sm">
            Initialize the SDK and create API endpoints for your frontend
          </p>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Code className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">3. Connect Frontend</h3>
          <p className="text-gray-600 text-sm">
            Call your backend APIs from React, Vue, or any frontend framework
          </p>
        </div>
      </div>

      {/* Code Examples */}
      <div className="card p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Code Examples</h3>
          
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Code Display */}
          <div className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto">
            <pre className="text-sm">
              <code>{codeExamples[activeTab as keyof typeof codeExamples]}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Framework Support */}
      <div className="card p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Supported Frameworks</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {frameworks.map((framework, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{framework.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-800">{framework.name}</h4>
                  <p className="text-sm text-gray-600">{framework.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-4">
          Don't see your framework? Walcache SDK works with any backend that can make HTTP requests.
        </p>
      </div>

      {/* Environment Variables */}
      <div className="card p-6 bg-yellow-50 border-yellow-200">
        <h3 className="text-lg font-semibold text-yellow-800 mb-4">🔐 Environment Configuration</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4">
          <pre className="text-sm">
{`# .env file
WALCACHE_BASE_URL=https://your-cdn-domain.com
WALCACHE_API_KEY=your-api-key-here
WALCACHE_DEFAULT_CHAIN=sui

# Optional: Chain-specific configurations
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your-key
SUI_RPC_URL=https://fullnode.mainnet.sui.io
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com`}
          </pre>
        </div>
        <div className="text-sm text-yellow-700 space-y-2">
          <p><strong>Required:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li><code>WALCACHE_BASE_URL</code> - Your CDN service endpoint</li>
            <li><code>WALCACHE_API_KEY</code> - Authentication key for your service</li>
          </ul>
          <p><strong>Optional:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li><code>WALCACHE_DEFAULT_CHAIN</code> - Default blockchain (sui, ethereum, solana)</li>
            <li>Chain-specific RPC URLs for direct blockchain interactions</li>
          </ul>
        </div>
      </div>

      {/* API Reference */}
      <div className="card p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">🚀 Key SDK Methods</h3>
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Core Upload Functions</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3 text-sm">
                <div>
                  <code className="bg-white px-2 py-1 rounded">uploadAsset(file, options)</code>
                  <p className="text-gray-600 mt-1">Upload any file to any blockchain with automatic optimization</p>
                </div>
                <div>
                  <code className="bg-white px-2 py-1 rounded">uploadSite(path, options)</code>
                  <p className="text-gray-600 mt-1">Deploy frontend applications with chain-specific routing</p>
                </div>
                <div>
                  <code className="bg-white px-2 py-1 rounded">uploadGatedFile(file, gating)</code>
                  <p className="text-gray-600 mt-1">Upload files with NFT/token access control</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Verification & Access</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3 text-sm">
                <div>
                  <code className="bg-white px-2 py-1 rounded">verifyOwnership(userAddress, assetId, chain)</code>
                  <p className="text-gray-600 mt-1">Verify NFT/token ownership across any blockchain</p>
                </div>
                <div>
                  <code className="bg-white px-2 py-1 rounded">downloadGatedFile(fileId, user, token)</code>
                  <p className="text-gray-600 mt-1">Download files with access verification</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Discovery & Management</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3 text-sm">
                <div>
                  <code className="bg-white px-2 py-1 rounded">listAssets(criteria)</code>
                  <p className="text-gray-600 mt-1">Find and list assets across multiple chains</p>
                </div>
                <div>
                  <code className="bg-white px-2 py-1 rounded">resolveDID(did)</code>
                  <p className="text-gray-600 mt-1">Resolve decentralized identity documents</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="card p-8 text-center bg-gradient-to-r from-primary-50 to-purple-50 border-primary-200">
        <h3 className="text-2xl font-bold text-primary-800 mb-4">
          Ready to Start Building?
        </h3>
        <p className="text-primary-700 mb-6 max-w-2xl mx-auto">
          You're all set! Start with a simple file upload and gradually add more features 
          like verification, gating, and cross-chain functionality.
        </p>
        <div className="flex justify-center gap-4">
          <button className="btn-primary">
            <GitBranch className="w-4 h-4 mr-2" />
            Clone Starter Template
          </button>
          <button className="btn-secondary">
            <Code className="w-4 h-4 mr-2" />
            View Full Documentation
          </button>
        </div>
      </div>
    </div>
  )
}