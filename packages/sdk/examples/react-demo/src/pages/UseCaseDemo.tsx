import React from 'react'
import { 
  Smartphone, 
  DollarSign, 
  Gamepad2, 
  UserCheck, 
  MessageSquare, 
  Play,
  ArrowRight,
  ExternalLink
} from 'lucide-react'

const useCases = [
  {
    icon: Smartphone,
    title: 'dApp Frontend Hosting',
    description: 'Deploy different site versions for different chains with automatic user routing',
    features: [
      'Chain-specific frontend versions',
      'Automatic user detection',
      'Smart routing based on wallet',
      'Zero downtime deployments'
    ],
    color: 'from-blue-500 to-blue-600',
    code: `// Upload chain-specific versions
await sdk.uploadSite('./site-eth', { chain: 'ethereum' })
await sdk.uploadSite('./site-sui', { chain: 'sui' })

// Auto-route users to their chain's version
const userChain = await sdk.detectUserChain()
const siteUrl = await sdk.getSiteUrl({ 
  siteName: 'my-dapp', 
  userChain 
})`
  },
  {
    icon: DollarSign,
    title: 'Data Marketplaces',
    description: 'Sell access to datasets with NFT/token gating and monetization',
    features: [
      'NFT/token-gated access',
      'Automated payments',
      'Usage analytics',
      'Revenue tracking'
    ],
    color: 'from-green-500 to-green-600',
    code: `// Upload with NFT gating
await sdk.uploadGatedFile(dataset, {
  gating: { 
    type: 'nft_ownership',
    contractAddress: '0xabc...',
    chain: 'ethereum' 
  }
})

// Verify and download
if (await sdk.verifyAccess({ user: '0x123...', fileId })) {
  const file = await sdk.downloadGatedFile(fileId)
}`
  },
  {
    icon: Gamepad2,
    title: 'Gaming Assets',
    description: 'User-generated content with ownership, trading, and cross-game compatibility',
    features: [
      'User-generated content',
      'NFT-based ownership',
      'Cross-game compatibility',
      'Trading marketplace'
    ],
    color: 'from-purple-500 to-purple-600',
    code: `// User uploads custom skin
await sdk.uploadAsset('./dragon-skin.png', {
  owner: '0xuser...',
  chain: 'sui',
  category: 'skin',
  gameId: 'dragon-quest',
  rarity: 'epic',
  tradeable: true
})

// List all user assets
const assets = await sdk.listAssets({ 
  owner: '0xuser...', 
  gameId: 'dragon-quest' 
})`
  },
  {
    icon: UserCheck,
    title: 'Decentralized Identity',
    description: 'Store and resolve DID documents with on-chain verification',
    features: [
      'W3C DID compliance',
      'Cross-chain resolution',
      'Identity verification',
      'Privacy controls'
    ],
    color: 'from-indigo-500 to-indigo-600',
    code: `// Store DID document
await sdk.uploadDID('did:sui:0x123...', didDocument, { 
  chain: 'sui',
  updatePolicy: 'owner_only' 
})

// Resolve DID anywhere
const { document } = await sdk.resolveDID('did:sui:0x123...')`
  },
  {
    icon: MessageSquare,
    title: 'Cross-Chain Logs',
    description: 'Audit trails and proofs for smart contracts across multiple blockchains',
    features: [
      'Immutable audit trails',
      'Cross-chain messaging',
      'Smart contract proofs',
      'Compliance reporting'
    ],
    color: 'from-yellow-500 to-yellow-600',
    code: `// Upload audit log
const logId = await sdk.uploadLog(auditData, {
  chain: 'ethereum',
  logType: 'audit'
})

// Get reference hash for smart contracts
const { referenceHash } = await sdk.getLogReference(logId)`
  },
  {
    icon: Play,
    title: 'Media Streaming',
    description: 'Gated content with NFT/token access control and premium experiences',
    features: [
      'Token-gated streaming',
      'Multiple quality levels',
      'DRM protection',
      'Analytics tracking'
    ],
    color: 'from-red-500 to-red-600',
    code: `// Upload gated video
await sdk.uploadMedia('./concert.mp4', {
  chain: 'ethereum',
  type: 'video',
  gating: { 
    type: 'nft_ownership',
    contractAddress: '0xabc...' 
  }
})

// Stream with verification
const stream = await sdk.streamMedia(mediaId, userAddress)
if (stream.hasAccess) {
  // User can stream the content
}`
  }
]

export default function UseCaseDemo() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Real-World Use Cases
        </h2>
        <p className="text-xl text-white opacity-90 mb-6 max-w-3xl mx-auto">
          Explore how developers are using Walcache SDK to build production applications 
          across multiple blockchains with a single, unified interface.
        </p>
      </div>

      {/* Use Cases Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {useCases.map((useCase, index) => {
          const Icon = useCase.icon
          return (
            <div key={index} className="card p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-12 h-12 bg-gradient-to-r ${useCase.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {useCase.title}
                  </h3>
                  <p className="text-gray-600">
                    {useCase.description}
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">Key Features:</h4>
                <ul className="space-y-2">
                  {useCase.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Code Example */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">Implementation:</h4>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
                    <code>{useCase.code}</code>
                  </pre>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-between items-center">
                <a
                  href={`#${useCase.title.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
                >
                  Learn more
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button className="btn-secondary text-sm">
                  Try Demo
                  <ArrowRight className="w-3 h-3 ml-1" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Architecture Overview */}
      <div className="card p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <h3 className="text-2xl font-bold text-blue-800 mb-6 text-center">
          🏗️ How It All Works Together
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white font-bold">1</span>
            </div>
            <h4 className="font-semibold text-blue-800 mb-2">Your React App</h4>
            <p className="text-sm text-blue-700">
              Frontend makes API calls to your backend service
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white font-bold">2</span>
            </div>
            <h4 className="font-semibold text-blue-800 mb-2">Your Backend</h4>
            <p className="text-sm text-blue-700">
              Server integrates Walcache SDK for multi-chain operations
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white font-bold">3</span>
            </div>
            <h4 className="font-semibold text-blue-800 mb-2">Walcache SDK</h4>
            <p className="text-sm text-blue-700">
              Handles all blockchain complexity automatically
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-3">Benefits of This Architecture:</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <ul className="space-y-2">
                <li>• <strong>Security:</strong> Private keys stay on your backend</li>
                <li>• <strong>Performance:</strong> Backend caching and optimization</li>
                <li>• <strong>Flexibility:</strong> Easy to modify business logic</li>
              </ul>
            </div>
            <div>
              <ul className="space-y-2">
                <li>• <strong>Scalability:</strong> Handle multiple users efficiently</li>
                <li>• <strong>Reliability:</strong> Error handling and retry logic</li>
                <li>• <strong>Compliance:</strong> Centralized policy enforcement</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="card p-8 text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          Ready to Build Your Use Case?
        </h3>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Start building your multi-chain application today. The SDK handles all the blockchain 
          complexity while you focus on your business logic and user experience.
        </p>
        <div className="flex justify-center gap-4">
          <button className="btn-primary">
            View Integration Guide
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
          <button className="btn-secondary">
            Download SDK
          </button>
        </div>
      </div>
    </div>
  )
}