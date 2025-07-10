import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { AuthGuard } from '../components/AuthGuard'
import { useRealtimeConnection, pollingService } from '../services/realtime'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import {
  User,
  CreditCard,
  Activity,
  Database,
  Zap,
  Calendar,
  TrendingUp,
  Shield,
  Key,
  BarChart3,
} from 'lucide-react'

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

    // Start polling for real-time updates
    pollingService.start()

    return () => {
      pollingService.stop()
    }
  }, [loadDashboard, loadTokens])

  if (!user) {
    return <div>Loading...</div>
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getSubscriptionColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
      case 'starter':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'professional':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
      case 'enterprise':
        return 'bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-100'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  const currentPlan = dashboard?.currentPlan

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Welcome back, {user.username}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className={getSubscriptionColor(user.subscriptionTier)}>
                <CreditCard className="h-4 w-4 mr-1" />
                {user.subscriptionTier.charAt(0).toUpperCase() +
                  user.subscriptionTier.slice(1)}
              </Badge>
              <Badge variant="outline">
                <Shield className="h-4 w-4 mr-1" />
                {user.subscriptionStatus}
              </Badge>
              <Badge
                variant={realtimeStatus.isConnected ? 'default' : 'secondary'}
              >
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${realtimeStatus.isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}
                ></div>
                {realtimeStatus.isConnected ? 'Live' : 'Polling'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Requests
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(dashboard?.totalUsage.totalRequests || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatNumber(dashboard?.totalUsage.monthlyRequests || 0)} this
                month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Bandwidth Used
              </CardTitle>
              <Database className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatBytes(dashboard?.totalUsage.totalBandwidth || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatBytes(dashboard?.totalUsage.monthlyBandwidth || 0)} this
                month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Tokens</CardTitle>
              <Key className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard?.activeTokens || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {tokens.length} total tokens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.9%</div>
              <p className="text-xs text-gray-500 mt-1">Uptime this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subscription Overview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Subscription Overview
                </CardTitle>
                <CardDescription>Current plan usage and limits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentPlan && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {currentPlan.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          ${currentPlan.price}/month
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Zap className="h-4 w-4 mr-1" />
                        Upgrade
                      </Button>
                    </div>

                    {/* Usage Progress Bars */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Monthly Requests</span>
                          <span>
                            {formatNumber(
                              dashboard?.totalUsage.monthlyRequests || 0,
                            )}{' '}
                            /{' '}
                            {formatNumber(currentPlan.limits.requestsPerMonth)}
                          </span>
                        </div>
                        <Progress
                          value={
                            ((dashboard?.totalUsage.monthlyRequests || 0) /
                              currentPlan.limits.requestsPerMonth) *
                            100
                          }
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Monthly Bandwidth</span>
                          <span>
                            {formatBytes(
                              dashboard?.totalUsage.monthlyBandwidth || 0,
                            )}{' '}
                            /{' '}
                            {formatBytes(currentPlan.limits.bandwidthPerMonth)}
                          </span>
                        </div>
                        <Progress
                          value={
                            ((dashboard?.totalUsage.monthlyBandwidth || 0) /
                              currentPlan.limits.bandwidthPerMonth) *
                            100
                          }
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Daily Requests</span>
                          <span>
                            {formatNumber(
                              dashboard?.totalUsage.dailyRequests || 0,
                            )}{' '}
                            / {formatNumber(currentPlan.limits.requestsPerDay)}
                          </span>
                        </div>
                        <Progress
                          value={
                            ((dashboard?.totalUsage.dailyRequests || 0) /
                              currentPlan.limits.requestsPerDay) *
                            100
                          }
                          className="h-2"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profile & Quick Actions */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-gray-600 dark:text-gray-300">
                    {user.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Username</label>
                  <p className="text-gray-600 dark:text-gray-300">
                    {user.username}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Member Since</label>
                  <p className="text-gray-600 dark:text-gray-300 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Login</label>
                  <p className="text-gray-600 dark:text-gray-300">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
                <Button className="w-full" variant="outline">
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Manage API Tokens
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  Cache Management
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing & Usage
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
