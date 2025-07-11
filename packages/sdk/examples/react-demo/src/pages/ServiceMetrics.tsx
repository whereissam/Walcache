import React, { useState, useEffect } from 'react'
import { BarChart3, RefreshCw, TrendingUp, Clock, Zap, Database } from 'lucide-react'
import { useWalcache } from '../contexts/WalcacheContext'
import ResultCard from '../components/ResultCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ServiceMetrics() {
  const { getMetrics, loading } = useWalcache()
  const [metrics, setMetrics] = useState<any>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const loadMetrics = async () => {
    const result = await getMetrics()
    setMetrics(result)
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const getStatusColor = (value: number, type: 'hitRate' | 'latency') => {
    if (type === 'hitRate') {
      if (value >= 90) return 'text-green-600'
      if (value >= 70) return 'text-yellow-600'
      return 'text-red-600'
    } else {
      if (value <= 100) return 'text-green-600'
      if (value <= 300) return 'text-yellow-600'
      return 'text-red-600'
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Service Metrics Dashboard
          </h2>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>Auto-refresh (5s)</span>
            </label>
            
            <button
              onClick={loadMetrics}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading && !metrics && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" text="Loading metrics..." />
          </div>
        )}

        {metrics && (
          <div className="space-y-6">
            {metrics.success ? (
              <>
                {/* Key Performance Indicators */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-600 font-medium">Requests</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {metrics.data.cdn.global.totalRequests.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-gray-600 font-medium">Hit Rate</span>
                    </div>
                    <div className={`text-2xl font-bold ${getStatusColor(metrics.data.cdn.global.globalHitRate, 'hitRate')}`}>
                      {metrics.data.cdn.global.globalHitRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">Cache hits</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs text-gray-600 font-medium">Latency</span>
                    </div>
                    <div className={`text-2xl font-bold ${getStatusColor(metrics.data.cdn.global.avgLatency, 'latency')}`}>
                      {metrics.data.cdn.global.avgLatency}ms
                    </div>
                    <div className="text-xs text-gray-500">Average</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-gray-600 font-medium">Assets</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {metrics.data.cdn.global.uniqueCIDs.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Unique</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs text-gray-600 font-medium">Uptime</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {formatUptime(metrics.data.service.uptime)}
                    </div>
                    <div className="text-xs text-gray-500">Hours</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-gray-600 font-medium">Memory</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                      {formatMemory(metrics.data.service.memory.heapUsed)}
                    </div>
                    <div className="text-xs text-gray-500">Used</div>
                  </div>
                </div>

                {/* Service Information */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Optimal Node:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {metrics.data.network.optimalNode}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Cache Backend:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {metrics.data.cdn.cache.using}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Last Updated:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {new Date().toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg border">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Health</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Cache Hit Rate:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                metrics.data.cdn.global.globalHitRate >= 90 ? 'bg-green-500' :
                                metrics.data.cdn.global.globalHitRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${metrics.data.cdn.global.globalHitRate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">
                            {metrics.data.cdn.global.globalHitRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Response Time:</span>
                        <span className={`text-sm font-medium ${getStatusColor(metrics.data.cdn.global.avgLatency, 'latency')}`}>
                          {metrics.data.cdn.global.avgLatency < 100 ? '🟢 Excellent' :
                           metrics.data.cdn.global.avgLatency < 300 ? '🟡 Good' : '🔴 Needs Attention'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Service Health:</span>
                        <span className="text-sm font-medium text-green-600">🟢 Healthy</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Chain Statistics */}
                <div className="bg-white p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Multi-Chain Performance</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">Ethereum</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <div className="flex justify-between">
                          <span>Avg Latency:</span>
                          <span>~250ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Success Rate:</span>
                          <span>98.5%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="text-green-600">🟢 Active</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                      <h4 className="font-medium text-cyan-800 mb-2">Sui</h4>
                      <div className="text-sm text-cyan-700 space-y-1">
                        <div className="flex justify-between">
                          <span>Avg Latency:</span>
                          <span>~150ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Success Rate:</span>
                          <span>99.2%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="text-green-600">🟢 Active</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-medium text-purple-800 mb-2">Solana</h4>
                      <div className="text-sm text-purple-700 space-y-1">
                        <div className="flex justify-between">
                          <span>Avg Latency:</span>
                          <span>~200ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Success Rate:</span>
                          <span>97.8%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="text-yellow-600">🟡 Beta</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <ResultCard type="error" title="Failed to Load Metrics">
                <p>{metrics.error}</p>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 Troubleshooting:</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
                    <li>Make sure your backend server is running</li>
                    <li>Check if the metrics endpoint is accessible</li>
                    <li>Verify your API configuration</li>
                  </ul>
                </div>
              </ResultCard>
            )}
          </div>
        )}
      </div>

      {/* Metrics Information */}
      <div className="card p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Understanding Metrics</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Performance Indicators</h4>
            <ul className="space-y-1 text-gray-600">
              <li><strong>Total Requests:</strong> Number of asset requests served</li>
              <li><strong>Hit Rate:</strong> Percentage of requests served from cache</li>
              <li><strong>Average Latency:</strong> Mean response time in milliseconds</li>
              <li><strong>Unique Assets:</strong> Number of distinct assets stored</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">System Health</h4>
            <ul className="space-y-1 text-gray-600">
              <li><strong>Uptime:</strong> How long the service has been running</li>
              <li><strong>Memory Usage:</strong> Current heap memory consumption</li>
              <li><strong>Optimal Node:</strong> Best performing network endpoint</li>
              <li><strong>Cache Backend:</strong> Storage system being used</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}