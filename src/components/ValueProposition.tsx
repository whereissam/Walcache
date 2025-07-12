import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  Zap,
  Shield,
  Globe,
  Code,
  BarChart3,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  Database,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

interface ApiMetric {
  label: string
  value: string
  trend: 'up' | 'down' | 'stable'
  icon: React.ReactNode
}

export function ValueProposition() {
  const [metrics, setMetrics] = useState<ApiMetric[]>([
    {
      label: 'Response Time',
      value: '< 50ms',
      trend: 'up',
      icon: <Zap className="h-4 w-4" />
    },
    {
      label: 'Cache Hit Rate',
      value: '94.2%',
      trend: 'up',
      icon: <Database className="h-4 w-4" />
    },
    {
      label: 'Global CDN Nodes',
      value: '25+',
      trend: 'stable',
      icon: <Globe className="h-4 w-4" />
    },
    {
      label: 'Monthly Requests',
      value: '2.4M+',
      trend: 'up',
      icon: <BarChart3 className="h-4 w-4" />
    }
  ])

  const features = [
    {
      icon: <Code className="h-6 w-6" />,
      title: 'Stripe-Style API',
      description: 'Professional, consistent API design with full TypeScript support and comprehensive documentation.',
      example: 'client.listBlobs({ limit: 10, cached: true })'
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Lightning Fast',
      description: 'Global CDN with intelligent caching delivers content with sub-50ms latency worldwide.',
      example: 'GET /v1/blobs/your-content → < 50ms'
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Decentralized Storage',
      description: 'Built on Walrus network for ultimate data integrity, availability, and censorship resistance.',
      example: 'Multi-chain verification across Sui, Ethereum, Solana'
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Real-time Analytics',
      description: 'Comprehensive metrics, performance monitoring, and usage analytics with Prometheus integration.',
      example: 'client.getGlobalAnalytics() → detailed insights'
    }
  ]

  const useCases = [
    {
      title: 'NFT Marketplaces',
      description: 'Store and serve NFT metadata and images with guaranteed availability',
      benefits: ['Immutable storage', 'Global CDN', 'Sub-second loading']
    },
    {
      title: 'Web3 Applications',
      description: 'Host dApp frontends with decentralized, censorship-resistant delivery',
      benefits: ['Zero downtime', 'Multi-chain support', 'Developer-friendly API']
    },
    {
      title: 'Content Creators',
      description: 'Distribute media content with token-gated access and monetization',
      benefits: ['Token gating', 'Analytics', 'Revenue streams']
    },
    {
      title: 'Enterprise Data',
      description: 'Archive critical data with cryptographic proof of integrity',
      benefits: ['Audit trails', 'Compliance ready', 'Enterprise SLA']
    }
  ]

  const apiPreview = {
    request: `// Initialize WCDN Client
const client = new WalrusCDNClient({
  baseUrl: 'https://your-cdn.com',
  apiKey: process.env.WCDN_API_KEY
})

// Upload and serve content
const upload = await client.createUpload(file)
const cdnUrl = client.getCDNUrl(upload.blob_id)

// Real-time analytics
const analytics = await client.getGlobalAnalytics()`,
    response: `{
  "object": "upload",
  "id": "upload_abc123",
  "blob_id": "blob_xyz789",
  "status": "completed",
  "created": 1703123456
}`
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary" className="px-3 py-1">
            <Zap className="h-3 w-3 mr-1" />
            v1 API Now Available
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Walrus CDN for Developers
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            The first professional CDN for decentralized storage. Stripe-style API, global performance, 
            Web3 native features.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/api-showcase">
            <Button size="lg" className="gap-2">
              <PlayCircle className="h-5 w-5" />
              Try Live API
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="gap-2">
            <Code className="h-5 w-5" />
            View Documentation
          </Button>
        </div>
      </div>

      {/* Live Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Live API Metrics
          </CardTitle>
          <CardDescription>
            Real-time performance data from our global CDN network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {metric.icon}
                  <span className="text-2xl font-bold">{metric.value}</span>
                </div>
                <p className="text-sm text-gray-600">{metric.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Preview */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Developer Experience</CardTitle>
            <CardDescription>
              Stripe-style API that developers love
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              <pre>{apiPreview.request}</pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Structured Responses</CardTitle>
            <CardDescription>
              Consistent, typed API responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              <pre>{apiPreview.response}</pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Features */}
      <div>
        <h2 className="text-3xl font-bold text-center mb-8">Why Choose WCDN?</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-600">{feature.description}</p>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <code className="text-sm text-gray-800">{feature.example}</code>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div>
        <h2 className="text-3xl font-bold text-center mb-8">Perfect For Your Use Case</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {useCases.map((useCase, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-xl">{useCase.title}</CardTitle>
                <CardDescription>{useCase.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {useCase.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="text-center py-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Build?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join developers building the future of decentralized content delivery
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/api-showcase">
              <Button size="lg" variant="secondary" className="gap-2">
                <PlayCircle className="h-5 w-5" />
                Try Live API Demo
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline" className="gap-2 text-white border-white hover:bg-white hover:text-blue-600">
                <Users className="h-5 w-5" />
                Start Building
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}