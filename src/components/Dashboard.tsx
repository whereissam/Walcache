import { useEffect } from 'react';
import { useWCDNStore } from '../store/wcdnStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
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
  Tooltip 
} from 'recharts';
import { formatBytes, formatNumber, formatPercentage, formatLatency, truncateCID } from '../lib/utils';
import { Activity, Database, Clock, HardDrive, Zap } from 'lucide-react';

export function Dashboard() {
  const { 
    globalStats, 
    cacheStats, 
    topCIDs, 
    isLoading, 
    error, 
    fetchGlobalStats 
  } = useWCDNStore();

  useEffect(() => {
    fetchGlobalStats();
    const interval = setInterval(fetchGlobalStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchGlobalStats]);

  if (isLoading && !globalStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  const hitRateData = globalStats ? [
    { name: 'Hits', value: globalStats.totalHits, color: '#10b981' },
    { name: 'Misses', value: globalStats.totalMisses, color: '#ef4444' }
  ] : [];

  const topCIDsData = topCIDs.map(cid => ({
    name: truncateCID(cid.cid),
    requests: cid.requests,
    latency: cid.avgLatency
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold">WCDN Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
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
              {formatNumber(globalStats?.totalHits || 0)} hits, {formatNumber(globalStats?.totalMisses || 0)} misses
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
            <p className="text-xs text-muted-foreground">
              Response time
            </p>
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
            <CardDescription>Distribution of cache hits vs misses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={hitRateData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {hitRateData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [formatNumber(value), 'Requests']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top CIDs</CardTitle>
            <CardDescription>Most frequently requested content</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topCIDsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'requests' ? formatNumber(value) : formatLatency(value),
                    name === 'requests' ? 'Requests' : 'Avg Latency'
                  ]}
                />
                <Bar dataKey="requests" fill="#3b82f6" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Memory Cache</span>
              </div>
              <div className="text-2xl font-bold">{formatNumber(cacheStats?.memory.keys || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(cacheStats?.memory.hitRate || 0)} hit rate
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Redis Cache</span>
              </div>
              <div className="text-2xl font-bold">{formatNumber(cacheStats?.redis.keys || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(cacheStats?.redis.memory || 0)} used
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <div className="text-2xl font-bold capitalize">{cacheStats?.using || 'Unknown'}</div>
              <p className="text-xs text-muted-foreground">
                Cache backend
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}