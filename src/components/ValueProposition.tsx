import { Link } from '@tanstack/react-router'
import { ArrowRight, Copy, Check } from 'lucide-react'
import { Button } from './ui/button'
import { useState } from 'react'

export function ValueProposition() {
  const [copied, setCopied] = useState(false)

  const installCmd = 'npm install @walcache/sdk'

  const copyInstall = async () => {
    try {
      await navigator.clipboard.writeText(installCmd)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable in insecure contexts
    }
  }

  return (
    <div className="space-y-16">
      {/* Hero — asymmetric, left-aligned */}
      <div className="pt-4 sm:pt-8">
        <div className="max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-[12px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            v1 API available
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-[1.1] tracking-tight">
            CDN for
            <br />
            Walrus Storage
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
            Serve decentralized content at the edge. Intelligent caching,
            real-time analytics, and a developer-first API.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link to="/api-showcase">
              <Button className="h-9 px-4 text-[13px] font-medium gap-1.5">
                Try the API
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <button
              onClick={copyInstall}
              className="flex items-center gap-2 h-9 px-3.5 rounded-md border border-border bg-card text-[13px] font-mono text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <span>{installCmd}</span>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Metrics strip — no cards, just numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12 py-6 border-y border-border">
        {[
          { value: '< 50ms', label: 'Edge latency' },
          { value: '94.2%', label: 'Cache hit rate' },
          { value: '25+', label: 'CDN nodes' },
          { value: '2.4M+', label: 'Monthly requests' },
        ].map((metric) => (
          <div key={metric.label}>
            <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
              {metric.value}
            </div>
            <div className="text-[13px] text-muted-foreground mt-1">
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      {/* Code preview — full width, no card wrapper */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Developer-first API
          </h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Consistent resource types, cursor pagination, typed responses. Built
            for developers who ship fast.
          </p>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-chart-2/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-chart-4/40" />
              <span className="ml-2 text-[11px] text-muted-foreground/60">
                upload.ts
              </span>
            </div>
            <pre className="p-4 text-[13px] leading-relaxed overflow-x-auto text-foreground/80">
              <code>{`import { WalrusCDN } from '@walcache/sdk'

const cdn = new WalrusCDN({
  apiKey: process.env.WCDN_API_KEY
})

const upload = await cdn.uploads.create(file)
const url = cdn.blobs.url(upload.blob_id)

// Real-time analytics
const stats = await cdn.analytics.global()`}</code>
            </pre>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Structured responses
          </h2>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Every response follows the same shape. No surprises.
          </p>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-chart-2/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-chart-4/40" />
              <span className="ml-2 text-[11px] text-muted-foreground/60">
                response.json
              </span>
            </div>
            <pre className="p-4 text-[13px] leading-relaxed overflow-x-auto text-foreground/80">
              <code>{`{
  "object": "upload",
  "id": "upload_abc123",
  "blob_id": "blob_xyz789",
  "status": "completed",
  "size": 2048576,
  "content_type": "image/png",
  "created": 1703123456,
  "cdn_url": "https://cdn.walcache.io/blob_xyz789"
}`}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Features — tight grid, no icons-above-headings pattern */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">
          Built for Web3 infrastructure
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          {[
            {
              title: 'Edge caching',
              desc: 'Content served from the nearest node. Sub-50ms globally with automatic failover.',
            },
            {
              title: 'Walrus native',
              desc: 'Built on Walrus for immutable, censorship-resistant storage with Sui blockchain proofs.',
            },
            {
              title: 'Real-time analytics',
              desc: 'Request tracking, geographic distribution, latency percentiles, and Prometheus export.',
            },
            {
              title: 'Access control',
              desc: 'NFT-gated content, allowlists, signed URLs with time-limited access and IP restrictions.',
            },
            {
              title: 'Webhooks',
              desc: 'Event-driven notifications for uploads, cache events, and analytics thresholds.',
            },
            {
              title: 'Multi-chain',
              desc: 'Register and verify content across Sui, Ethereum, and Solana with cross-chain proofs.',
            },
          ].map((feature) => (
            <div key={feature.title} className="space-y-1.5">
              <h3 className="text-[14px] font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA — simple, not a gradient card */}
      <div className="border-t border-border pt-10 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Start building
            </h2>
            <p className="text-[14px] text-muted-foreground mt-1">
              Free tier includes 10K requests/month and 1GB bandwidth.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/register">
              <Button className="h-9 px-4 text-[13px] font-medium gap-1.5">
                Create account
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/api">
              <Button
                variant="outline"
                className="h-9 px-4 text-[13px] font-medium"
              >
                Read docs
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
