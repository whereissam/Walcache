import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Upload, 
  Info, 
  Globe, 
  Shield, 
  BarChart3, 
  Layers,
  Code,
  ArrowRight
} from 'lucide-react'

const features = [
  {
    icon: Upload,
    title: 'Upload Assets',
    description: 'Upload files to any blockchain with automatic optimization',
    path: '/upload',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Info,
    title: 'Asset Information',
    description: 'Get detailed info about stored assets and their status',
    path: '/asset-info',
    color: 'from-green-500 to-green-600',
  },
  {
    icon: Globe,
    title: 'Multi-Chain URLs',
    description: 'Generate optimized CDN URLs for any blockchain',
    path: '/urls',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: Shield,
    title: 'Asset Verification',
    description: 'Verify ownership for gated content access',
    path: '/verify',
    color: 'from-red-500 to-red-600',
  },
  {
    icon: BarChart3,
    title: 'Service Metrics',
    description: 'Monitor performance and usage statistics',
    path: '/metrics',
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    icon: Layers,
    title: 'Use Cases',
    description: 'Explore real-world implementation examples',
    path: '/use-cases',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    icon: Code,
    title: 'Integration Guide',
    description: 'Learn how to integrate Walcache SDK',
    path: '/integration',
    color: 'from-gray-700 to-gray-800',
  },
]

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="card p-8 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Welcome to Walcache SDK Demo
        </h2>
        <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
          Experience the power of unified multi-chain storage. This React demo showcases 
          how developers can integrate Walcache SDK into their backend services to provide 
          seamless blockchain storage across Ethereum, Sui, and Solana.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/upload" className="btn-primary">
            Start Uploading <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <Link to="/integration" className="btn-secondary">
            View Integration
          </Link>
        </div>
      </div>

      {/* Key Benefits */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">One API</h3>
            <p className="text-gray-600">
              Single interface works across Ethereum, Sui, and Solana
            </p>
          </div>
        </div>

        <div className="card p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Zero Complexity</h3>
            <p className="text-gray-600">
              SDK handles all blockchain-specific implementations
            </p>
          </div>
        </div>

        <div className="card p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Production Ready</h3>
            <p className="text-gray-600">
              Built-in optimization, caching, and error handling
            </p>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Link
              key={feature.path}
              to={feature.path}
              className="card p-6 group hover:scale-105 transition-transform duration-300"
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-primary-600 transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {feature.description}
              </p>
              
              <div className="flex items-center text-primary-600 font-medium">
                Try it out
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="card p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
          Why Developers Choose Walcache
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary-600">3</div>
            <div className="text-sm text-gray-600">Blockchains Supported</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary-600">1</div>
            <div className="text-sm text-gray-600">Unified API</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary-600">6</div>
            <div className="text-sm text-gray-600">Use Cases</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary-600">100%</div>
            <div className="text-sm text-gray-600">Developer Friendly</div>
          </div>
        </div>
      </div>
    </div>
  )
}