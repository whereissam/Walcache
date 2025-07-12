/**
 * Enhanced Analytics API with Webhook Integration (v1)
 */

import { FastifyInstance } from 'fastify';
import { webhookService } from '../webhooks.js';

// Enhanced analytics with real-time monitoring and alerting
export async function enhancedAnalyticsRoutes(fastify: FastifyInstance) {
  
  // =============================================================================
  // REAL-TIME ANALYTICS
  // =============================================================================

  // Get real-time analytics stream
  fastify.get('/analytics/realtime', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial data
    const initialData = {
      timestamp: Date.now(),
      activeConnections: 1,
      requestsPerSecond: 0,
      cacheHitRate: 0.85,
      errorRate: 0.02,
    };

    reply.raw.write(`data: ${JSON.stringify(initialData)}\n\n`);

    // Send updates every 5 seconds
    const interval = setInterval(() => {
      const data = {
        timestamp: Date.now(),
        activeConnections: Math.floor(Math.random() * 100) + 50,
        requestsPerSecond: Math.floor(Math.random() * 1000) + 100,
        cacheHitRate: 0.8 + Math.random() * 0.15,
        errorRate: Math.random() * 0.05,
        topBlobs: [
          { blobId: 'blob_1', requests: 150 },
          { blobId: 'blob_2', requests: 120 },
          { blobId: 'blob_3', requests: 90 },
        ],
      };

      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    }, 5000);

    // Cleanup on client disconnect
    request.raw.on('close', () => {
      clearInterval(interval);
    });
  });

  // =============================================================================
  // ANALYTICS ALERTS AND THRESHOLDS
  // =============================================================================

  // Configure analytics alerts
  fastify.post<{
    Body: {
      metric: string;
      threshold: number;
      operator: 'gt' | 'lt' | 'eq';
      severity: 'warning' | 'critical';
      enabled: boolean;
      webhookIds?: string[];
    }
  }>('/analytics/alerts', async (request, reply) => {
    try {
      const { metric, threshold, operator, severity, enabled, webhookIds } = request.body;

      const alert = {
        id: crypto.randomUUID(),
        metric,
        threshold,
        operator,
        severity,
        enabled,
        webhookIds: webhookIds || [],
        createdAt: new Date().toISOString(),
        triggeredCount: 0,
        lastTriggered: null,
      };

      // Store alert configuration (in real app, would use database)
      // For demo, just return the configuration
      
      return reply.status(201).send({
        object: 'analytics_alert',
        created: Math.floor(Date.now() / 1000),
        data: alert,
      });
    } catch (error) {
      return reply.status(400).send({
        error: {
          type: 'validation_error',
          message: error.message,
        },
      });
    }
  });

  // List analytics alerts
  fastify.get('/analytics/alerts', async (request, reply) => {
    // Mock alert configurations
    const alerts = [
      {
        id: '1',
        metric: 'cache_hit_rate',
        threshold: 0.7,
        operator: 'lt',
        severity: 'warning',
        enabled: true,
        triggeredCount: 3,
        lastTriggered: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '2',
        metric: 'error_rate',
        threshold: 0.05,
        operator: 'gt',
        severity: 'critical',
        enabled: true,
        triggeredCount: 0,
        lastTriggered: null,
      },
    ];

    return reply.send({
      object: 'list',
      data: alerts,
      has_more: false,
      url: '/v1/analytics/alerts',
    });
  });

  // =============================================================================
  // CUSTOM ANALYTICS QUERIES
  // =============================================================================

  // Execute custom analytics query
  fastify.post<{
    Body: {
      metrics: string[];
      filters?: {
        blobId?: string;
        timeRange?: {
          start: string;
          end: string;
        };
        chains?: string[];
      };
      groupBy?: string[];
      aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
    }
  }>('/analytics/query', async (request, reply) => {
    try {
      const { metrics, filters, groupBy, aggregation = 'sum' } = request.body;

      // Mock query execution
      const results = {
        query: {
          metrics,
          filters,
          groupBy,
          aggregation,
        },
        data: [
          {
            timestamp: '2024-01-01T00:00:00Z',
            requests: 1000,
            bytes_served: 1024000,
            cache_hit_rate: 0.85,
          },
          {
            timestamp: '2024-01-01T01:00:00Z',
            requests: 1200,
            bytes_served: 1228800,
            cache_hit_rate: 0.87,
          },
        ],
        execution_time_ms: 45,
        rows_returned: 2,
      };

      return reply.send({
        object: 'analytics_query_result',
        created: Math.floor(Date.now() / 1000),
        data: results,
      });
    } catch (error) {
      return reply.status(400).send({
        error: {
          type: 'validation_error',
          message: error.message,
        },
      });
    }
  });

  // =============================================================================
  // ANALYTICS EXPORTS
  // =============================================================================

  // Export analytics data
  fastify.post<{
    Body: {
      format: 'csv' | 'json' | 'parquet';
      timeRange: {
        start: string;
        end: string;
      };
      metrics?: string[];
      filters?: Record<string, any>;
    }
  }>('/analytics/export', async (request, reply) => {
    try {
      const { format, timeRange, metrics, filters } = request.body;

      // Mock export process
      const exportJob = {
        id: crypto.randomUUID(),
        status: 'processing',
        format,
        timeRange,
        metrics,
        filters,
        createdAt: new Date().toISOString(),
        estimatedCompletionTime: new Date(Date.now() + 60000).toISOString(),
      };

      // In real implementation, would start background job
      // and send webhook notification when complete

      return reply.status(202).send({
        object: 'export_job',
        created: Math.floor(Date.now() / 1000),
        data: exportJob,
      });
    } catch (error) {
      return reply.status(400).send({
        error: {
          type: 'validation_error',
          message: error.message,
        },
      });
    }
  });

  // Get export job status
  fastify.get<{ Params: { jobId: string } }>(
    '/analytics/export/:jobId', 
    async (request, reply) => {
      const { jobId } = request.params;

      // Mock job status
      const job = {
        id: jobId,
        status: 'completed',
        format: 'csv',
        createdAt: new Date(Date.now() - 120000).toISOString(),
        completedAt: new Date(Date.now() - 30000).toISOString(),
        downloadUrl: `https://cdn.wcdn.dev/exports/${jobId}.csv`,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        fileSize: 1024000,
        rowCount: 10000,
      };

      return reply.send({
        object: 'export_job',
        data: job,
      });
    }
  );

  // =============================================================================
  // ANALYTICS DASHBOARDS
  // =============================================================================

  // Get dashboard configuration
  fastify.get('/analytics/dashboards', async (request, reply) => {
    const dashboards = [
      {
        id: 'overview',
        name: 'Overview Dashboard',
        description: 'High-level CDN performance metrics',
        widgets: [
          {
            id: 'requests_over_time',
            type: 'line_chart',
            title: 'Requests Over Time',
            metric: 'total_requests',
            timeRange: '24h',
          },
          {
            id: 'cache_hit_rate',
            type: 'gauge',
            title: 'Cache Hit Rate',
            metric: 'cache_hit_rate',
            target: 0.85,
          },
          {
            id: 'top_blobs',
            type: 'table',
            title: 'Top Requested Blobs',
            metric: 'blob_requests',
            limit: 10,
          },
        ],
      },
      {
        id: 'blockchain',
        name: 'Blockchain Analytics',
        description: 'Multi-chain verification and registration metrics',
        widgets: [
          {
            id: 'verification_success_rate',
            type: 'donut_chart',
            title: 'Verification Success Rate by Chain',
            metric: 'verification_rate',
            groupBy: 'chain',
          },
          {
            id: 'registrations_over_time',
            type: 'area_chart',
            title: 'Blockchain Registrations',
            metric: 'blockchain_registrations',
            groupBy: 'chain',
          },
        ],
      },
    ];

    return reply.send({
      object: 'dashboard_list',
      data: dashboards,
    });
  });

  // Get dashboard data
  fastify.get<{ 
    Params: { dashboardId: string };
    Querystring: { timeRange?: string }
  }>('/analytics/dashboards/:dashboardId/data', async (request, reply) => {
    const { dashboardId } = request.params;
    const { timeRange = '24h' } = request.query;

    // Mock dashboard data
    const data = {
      dashboardId,
      timeRange,
      lastUpdated: new Date().toISOString(),
      widgets: {
        requests_over_time: {
          data: Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
            value: Math.floor(Math.random() * 1000) + 500,
          })),
        },
        cache_hit_rate: {
          current: 0.87,
          target: 0.85,
          trend: 'up',
        },
        top_blobs: {
          data: [
            { blobId: 'blob_1', requests: 1500, bytes: 1024000 },
            { blobId: 'blob_2', requests: 1200, bytes: 512000 },
            { blobId: 'blob_3', requests: 900, bytes: 256000 },
          ],
        },
      },
    };

    return reply.send({
      object: 'dashboard_data',
      data,
    });
  });

  // =============================================================================
  // PERFORMANCE MONITORING
  // =============================================================================

  // Get performance metrics
  fastify.get('/analytics/performance', async (request, reply) => {
    const metrics = {
      timestamp: Date.now(),
      response_times: {
        p50: 45,
        p95: 120,
        p99: 250,
        avg: 67,
      },
      throughput: {
        requests_per_second: 150,
        bytes_per_second: 1024000,
      },
      errors: {
        total: 23,
        rate: 0.015,
        by_type: {
          '404': 15,
          '500': 5,
          '503': 3,
        },
      },
      cache: {
        hit_rate: 0.87,
        miss_rate: 0.13,
        eviction_rate: 0.02,
      },
      blockchain: {
        verification_latency: {
          ethereum: 2500,
          sui: 1800,
          average: 2150,
        },
        success_rates: {
          ethereum: 0.98,
          sui: 0.95,
          overall: 0.96,
        },
      },
    };

    return reply.send({
      object: 'performance_metrics',
      created: Math.floor(Date.now() / 1000),
      data: metrics,
    });
  });

  // =============================================================================
  // WEBHOOK INTEGRATION FOR ANALYTICS
  // =============================================================================

  // Trigger analytics webhook (for testing/demo)
  fastify.post<{
    Body: {
      metric: string;
      value: number;
      threshold: number;
      severity: 'warning' | 'critical';
    }
  }>('/analytics/trigger-webhook', async (request, reply) => {
    try {
      const { metric, value, threshold, severity } = request.body;

      // Send webhook notification
      await webhookService.sendWebhook('analytics.threshold', {
        metric,
        value,
        threshold,
        severity,
        timestamp: new Date().toISOString(),
        message: `${metric} (${value}) ${value > threshold ? 'exceeded' : 'fell below'} threshold (${threshold})`,
      });

      return reply.send({
        success: true,
        message: 'Analytics webhook triggered',
      });
    } catch (error) {
      return reply.status(500).send({
        error: {
          type: 'api_error',
          message: error.message,
        },
      });
    }
  });
}