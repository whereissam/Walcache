import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import {
  Key,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { AuthGuard } from '../components/AuthGuard'
import { pollingService, useRealtimeConnection } from '../services/realtime'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}

function DashboardContent() {
  const { user, dashboard, tokens, loadDashboard, loadTokens } = useAuthStore()
  const realtimeStatus = useRealtimeConnection()

  useEffect(() => {
    loadDashboard()
    loadTokens()
    pollingService.start()
    return () => { pollingService.stop() }
  }, [loadDashboard, loadTokens])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
    return num.toString()
  }

  const currentPlan = dashboard?.currentPlan

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-[14px] text-muted-foreground mt-0.5">
            Welcome back, {user.username}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-[12px] font-medium text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${realtimeStatus.isConnected ? 'bg-primary' : 'bg-chart-2'} animate-pulse`} />
            {realtimeStatus.isConnected ? 'Live' : 'Polling'}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-[12px] font-medium text-primary capitalize">
            {user.subscriptionTier}
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatBlock
          label="Total requests"
          value={formatNumber(dashboard?.totalUsage.totalRequests || 0)}
          sub={`${formatNumber(dashboard?.totalUsage.monthlyRequests || 0)} this month`}
        />
        <StatBlock
          label="Bandwidth"
          value={formatBytes(dashboard?.totalUsage.totalBandwidth || 0)}
          sub={`${formatBytes(dashboard?.totalUsage.monthlyBandwidth || 0)} this month`}
        />
        <StatBlock
          label="API tokens"
          value={String(dashboard?.activeTokens || 0)}
          sub={`${tokens.length} total`}
        />
        <StatBlock label="Uptime" value="99.9%" sub="This month" />
      </div>

      {/* Plan usage */}
      {currentPlan && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-foreground">{currentPlan.name}</h2>
              <p className="text-[12px] text-muted-foreground">${currentPlan.price}/month</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[12px]">
              Upgrade
            </Button>
          </div>

          <div className="space-y-3">
            <UsageBar
              label="Monthly requests"
              used={dashboard?.totalUsage.monthlyRequests || 0}
              limit={currentPlan.limits.requestsPerMonth}
              format={formatNumber}
            />
            <UsageBar
              label="Monthly bandwidth"
              used={dashboard?.totalUsage.monthlyBandwidth || 0}
              limit={currentPlan.limits.bandwidthPerMonth}
              format={formatBytes}
            />
            <UsageBar
              label="Daily requests"
              used={dashboard?.totalUsage.dailyRequests || 0}
              limit={currentPlan.limits.requestsPerDay}
              format={formatNumber}
            />
          </div>
        </section>
      )}

      {/* Profile + quick actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile */}
        <section className="space-y-3">
          <h2 className="text-[14px] font-semibold text-foreground">Profile</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-[13px]">
              <tbody>
                {[
                  ['Email', user.email],
                  ['Username', user.username],
                  ['Member since', new Date(user.createdAt).toLocaleDateString()],
                  ['Last login', user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'],
                  ['Status', user.subscriptionStatus],
                ].map(([label, value], i) => (
                  <tr key={label} className={i > 0 ? 'border-t border-border' : ''}>
                    <td className="px-4 py-2.5 text-muted-foreground w-32">{label}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick actions */}
        <section className="space-y-3">
          <h2 className="text-[14px] font-semibold text-foreground">Quick actions</h2>
          <div className="space-y-1.5">
            {[
              { icon: <Key className="h-3.5 w-3.5" />, label: 'Manage API Tokens', href: '/tokens' },
              { icon: <Key className="h-3.5 w-3.5" />, label: 'View Analytics', href: '/' },
              { icon: <Key className="h-3.5 w-3.5" />, label: 'Cache Management', href: '/cache' },
              { icon: <Key className="h-3.5 w-3.5" />, label: 'Upload Files', href: '/upload' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                {action.icon}
                {action.label}
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function StatBlock({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{value}</div>
      <div className="text-[12px] text-muted-foreground/70">{sub}</div>
    </div>
  )
}

function UsageBar({
  label,
  used,
  limit,
  format,
}: {
  label: string
  used: number
  limit: number
  format: (n: number) => string
}) {
  const pct = Math.min((used / limit) * 100, 100)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground tabular-nums">
          {format(used)} / {format(limit)}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  )
}
