import { useMemo, memo } from 'react'
import {
  useGlobalStats,
  useCacheStats,
  useTopCIDs,
} from '../hooks/api/useStats'
import { useRealtimeConnection } from '../services/realtime'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts'
import {
  formatBytes,
  formatNumber,
  formatPercentage,
  formatLatency,
  truncateCID,
  formatDate,
} from '../lib/utils'
import {
  Activity,
  Database,
  Clock,
  HardDrive,
  Zap,
  TrendingUp,
  Globe,
  Users,
} from 'lucide-react'

export const Dashboard = memo(function Dashboard() {
  // Use React Query hooks for data fetching
  const {
    data: globalStats,
    isLoading: globalLoading,
    error: globalError,
  } = useGlobalStats()
  const { data: cacheStats, isLoading: cacheLoading } = useCacheStats()
  const { data: topCIDs, isLoading: topCIDsLoading } = useTopCIDs()

  const realtimeStatus = useRealtimeConnection()

  // Combine loading states
  const isLoading = globalLoading || cacheLoading || topCIDsLoading
  const error = globalError?.message

  // All hooks must be at the top level - before any early returns
  // Memoize expensive calculations
  const pieChartData = useMemo(() => {
    if (!globalStats) return []
    return [
      {
        name: 'Hits',
        value: globalStats.totalHits,
        fill: 'hsl(var(--chart-1))',
      },
      {
        name: 'Misses',
        value: globalStats.totalMisses,
        fill: 'hsl(var(--chart-2))',
      },
    ]
  }, [globalStats])

  const topCIDsChartData = useMemo(() => {
    if (!topCIDs || topCIDs.length === 0) return []
    return topCIDs.slice(0, 10).map((cid, index) => ({
      name: truncateCID(cid.cid),
      requests: cid.requests,
      hits: cid.hits,
      hitRate: cid.hitRate,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }))
  }, [topCIDs])

  const geographicData = useMemo(() => {
    if (!globalStats?.geographic) return []
    return globalStats.geographic.slice(0, 8).map((geo, index) => ({
      name: geo.region,
      requests: geo.requests,
      percentage: geo.percentage,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }))
  }, [globalStats?.geographic])

  // Generate sample latency trend data (memoized)
  const latencyTrendData = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        latency: Math.random() * 200 + 50,
        requests: Math.floor(Math.random() * 100) + 10,
      })),
    [],
  )

  // Use memoized data for better performance
  const hitRateData = pieChartData
  const topCIDsData = topCIDsChartData

  // Early returns after all hooks
  if (isLoading && !globalStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <p className="text-destructive-foreground">Error: {error}</p>
      </div>
    )
  }

  // Use memoized geographic data
  const geoData =
    geographicData.length > 0
      ? geographicData
      : [
          { region: 'Europe', requests: 0, percentage: 100 },
          { region: 'North America', requests: 0, percentage: 0 },
          { region: 'Asia Pacific', requests: 0, percentage: 0 },
          { region: 'Others', requests: 0, percentage: 0 },
        ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Walcache Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time cache analytics and performance monitoring
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(globalStats?.totalRequests || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {globalStats?.uniqueCIDs || 0} unique CIDs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(globalStats?.globalHitRate || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(globalStats?.totalHits || 0)} hits,{' '}
              {formatNumber(globalStats?.totalMisses || 0)} misses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatLatency(globalStats?.avgLatency || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {cacheStats?.using || 'Unknown'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(cacheStats?.memory.keys || 0)} keys in memory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cache Hit Rate</CardTitle>
            <CardDescription>
              Distribution of cache hits vs misses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={hitRateData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {hitRateData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    formatNumber(value),
                    'Requests',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Request sources by region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {geoData.map((region, index) => (
                <div
                  key={region.region}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: `hsl(${index * 90}, 70%, 50%)`,
                      }}
                    />
                    <span className="text-sm font-medium">{region.region}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">
                      {formatNumber(region.requests)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {region.percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Latency Trend (24h)</CardTitle>
            <CardDescription>
              Average response time over the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={latencyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value: number) => [
                    formatLatency(value),
                    'Latency',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top CIDs Performance</CardTitle>
            <CardDescription>
              Most frequently requested content with hit rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topCIDsData.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'requests')
                      return [formatNumber(value), 'Requests']
                    if (name === 'hitRate')
                      return [`${value.toFixed(1)}%`, 'Hit Rate']
                    return [formatLatency(value), 'Avg Latency']
                  }}
                />
                <Bar dataKey="requests" fill="hsl(var(--primary))" />
                <Bar dataKey="hitRate" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cache Details */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Details</CardTitle>
          <CardDescription>Memory and Redis cache statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Memory Cache</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold">
                {formatNumber(cacheStats?.memory.keys || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(cacheStats?.memory.hitRate || 0)} hit rate
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-chart-2" />
                <span className="text-sm font-medium">Redis Cache</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold">
                {formatNumber(cacheStats?.redis.keys || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(cacheStats?.redis.memory || 0)} used
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-chart-1" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold capitalize">
                {cacheStats?.using || 'Unknown'}
              </div>
              <p className="text-xs text-muted-foreground">Cache backend</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
