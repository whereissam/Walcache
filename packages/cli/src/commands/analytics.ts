import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import ora from 'ora';
import { getWCDNClient, log, verbose, formatBytes, formatDuration } from '../utils/config.js';

export const analyticsCommand = new Command('analytics')
  .description('View WCDN analytics and performance metrics');

// Global analytics command
analyticsCommand
  .command('global')
  .description('Show global analytics')
  .action(async () => {
    try {
      const client = getWCDNClient();
      
      const spinner = ora('Fetching global analytics...').start();
      
      try {
        const analytics = await client.getGlobalAnalytics();
        spinner.succeed('Global analytics retrieved');

        // Global metrics
        console.log(chalk.bold('\n📊 Global Metrics:'));
        const globalData = [
          ['Metric', 'Value'],
          ['Total Requests', analytics.global.total_requests.toLocaleString()],
          ['Cache Hits', analytics.global.cache_hits.toLocaleString()],
          ['Cache Misses', analytics.global.cache_misses.toLocaleString()],
          ['Hit Rate', `${(analytics.global.cache_hits / analytics.global.total_requests * 100).toFixed(2)}%`],
          ['Total Bytes Served', formatBytes(analytics.global.total_bytes_served)],
          ['Unique Blobs', analytics.global.unique_cids.toLocaleString()],
          ['Uptime', formatDuration(analytics.global.uptime * 1000)],
        ];

        console.log(table(globalData, {
          header: {
            alignment: 'center',
            content: chalk.blue('Global Statistics'),
          },
        }));

        // Cache metrics
        console.log(chalk.bold('\n💾 Cache Metrics:'));
        const cacheData = [
          ['Metric', 'Value'],
          ['Total Entries', analytics.cache.total_entries.toLocaleString()],
          ['Total Size', formatBytes(analytics.cache.total_size)],
          ['Pinned Entries', analytics.cache.pinned_entries.toLocaleString()],
          ['Memory Usage', `${analytics.cache.memory_usage.toFixed(2)} MB`],
          ['Redis Connected', analytics.cache.redis_connected ? '✓ Yes' : '✗ No'],
        ];

        console.log(table(cacheData, {
          header: {
            alignment: 'center',
            content: chalk.green('Cache Performance'),
          },
        }));

        // Top blobs
        if (analytics.top_blobs?.length > 0) {
          console.log(chalk.bold('\n🔥 Top Requested Blobs:'));
          const topBlobsData = [
            ['Rank', 'Blob ID', 'Requests', 'Share'],
            ...analytics.top_blobs.slice(0, 10).map((blob, index) => [
              (index + 1).toString(),
              blob.cid.slice(0, 20) + '...',
              blob.requests.toLocaleString(),
              `${(blob.requests / analytics.global.total_requests * 100).toFixed(2)}%`,
            ]),
          ];

          console.log(table(topBlobsData, {
            header: {
              alignment: 'center',
              content: chalk.yellow('Popular Content'),
            },
          }));
        }

        // Geographic distribution
        if (analytics.geographic && Object.keys(analytics.geographic).length > 0) {
          console.log(chalk.bold('\n🌍 Geographic Distribution:'));
          const geoData = [
            ['Region', 'Requests', 'Share'],
            ...Object.entries(analytics.geographic)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10)
              .map(([region, requests]) => [
                region,
                requests.toLocaleString(),
                `${(requests / analytics.global.total_requests * 100).toFixed(2)}%`,
              ]),
          ];

          console.log(table(geoData, {
            header: {
              alignment: 'center',
              content: chalk.cyan('Request Origins'),
            },
          }));
        }

        // System metrics
        if (analytics.system) {
          console.log(chalk.bold('\n⚙️ System Metrics:'));
          const systemData = [
            ['Metric', 'Value'],
            ['Memory Usage', `${analytics.system.memory_usage.toFixed(2)} MB`],
            ['CPU Usage', `${analytics.system.cpu_usage.toFixed(2)}%`],
            ['Uptime', formatDuration(analytics.system.uptime * 1000)],
          ];

          console.log(table(systemData, {
            header: {
              alignment: 'center',
              content: chalk.magenta('System Performance'),
            },
          }));
        }

        // Application metrics
        if (analytics.application) {
          console.log(chalk.bold('\n🚀 Application Metrics:'));
          const appData = [
            ['Metric', 'Value'],
            ['Active Connections', analytics.application.active_connections.toLocaleString()],
            ['Requests/Second', analytics.application.requests_per_second.toFixed(2)],
            ['Error Rate', `${(analytics.application.error_rate * 100).toFixed(2)}%`],
          ];

          console.log(table(appData, {
            header: {
              alignment: 'center',
              content: chalk.red('Application Health'),
            },
          }));

          // Performance indicators
          const hitRate = analytics.global.cache_hits / analytics.global.total_requests;
          const errorRate = analytics.application.error_rate;

          console.log(chalk.bold('\n📈 Performance Indicators:'));
          
          if (hitRate > 0.9) {
            console.log(chalk.green('✓ Excellent cache performance (>90% hit rate)'));
          } else if (hitRate > 0.7) {
            console.log(chalk.yellow('⚠ Good cache performance (70-90% hit rate)'));
          } else {
            console.log(chalk.red('⚠ Poor cache performance (<70% hit rate)'));
          }

          if (errorRate < 0.01) {
            console.log(chalk.green('✓ Low error rate (<1%)'));
          } else if (errorRate < 0.05) {
            console.log(chalk.yellow('⚠ Moderate error rate (1-5%)'));
          } else {
            console.log(chalk.red('⚠ High error rate (>5%)'));
          }

          if (analytics.application.requests_per_second > 100) {
            console.log(chalk.green('✓ High throughput (>100 req/s)'));
          } else if (analytics.application.requests_per_second > 10) {
            console.log(chalk.yellow('⚠ Moderate throughput (10-100 req/s)'));
          } else {
            console.log(chalk.gray('ℹ Low throughput (<10 req/s)'));
          }
        }

      } catch (error) {
        spinner.fail(`Failed to get global analytics: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Analytics error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// Blob analytics command
analyticsCommand
  .command('blob')
  .description('Show analytics for a specific blob')
  .argument('<blob-id>', 'blob ID to analyze')
  .action(async (blobId) => {
    try {
      const client = getWCDNClient();
      
      const spinner = ora(`Fetching analytics for blob ${blobId}...`).start();
      
      try {
        const analytics = await client.getBlobAnalytics(blobId);
        spinner.succeed('Blob analytics retrieved');

        console.log(chalk.bold(`\n📊 Analytics for Blob: ${blobId}\n`));

        // Basic metrics
        const basicData = [
          ['Metric', 'Value'],
          ['Total Requests', analytics.total_requests.toLocaleString()],
          ['Cache Hits', analytics.cache_hits.toLocaleString()],
          ['Cache Misses', analytics.cache_misses.toLocaleString()],
          ['Hit Rate', `${(analytics.cache_hits / analytics.total_requests * 100).toFixed(2)}%`],
          ['Total Bytes Served', formatBytes(analytics.total_bytes_served)],
          ['Last Accessed', new Date(analytics.last_accessed * 1000).toLocaleString()],
          ['Created', new Date(analytics.created * 1000).toLocaleString()],
        ];

        console.log(table(basicData, {
          header: {
            alignment: 'center',
            content: chalk.blue('Blob Statistics'),
          },
        }));

        // Geographic distribution
        if (analytics.geographic_stats && Object.keys(analytics.geographic_stats).length > 0) {
          console.log(chalk.bold('\n🌍 Geographic Distribution:'));
          const geoData = [
            ['Region', 'Requests', 'Share'],
            ...Object.entries(analytics.geographic_stats)
              .sort(([,a], [,b]) => b - a)
              .map(([region, requests]) => [
                region,
                requests.toLocaleString(),
                `${(requests / analytics.total_requests * 100).toFixed(2)}%`,
              ]),
          ];

          console.log(table(geoData, {
            header: {
              alignment: 'center',
              content: chalk.cyan('Request Origins'),
            },
          }));
        }

        // Performance insights
        console.log(chalk.bold('\n📈 Performance Insights:'));
        
        const hitRate = analytics.cache_hits / analytics.total_requests;
        const avgBytesPerRequest = analytics.total_bytes_served / analytics.total_requests;

        console.log(`• Average bytes per request: ${formatBytes(avgBytesPerRequest)}`);
        
        if (hitRate > 0.9) {
          console.log(chalk.green('• Excellent cache performance for this blob'));
        } else if (hitRate > 0.7) {
          console.log(chalk.yellow('• Good cache performance for this blob'));
        } else {
          console.log(chalk.red('• Poor cache performance for this blob'));
        }

        if (analytics.total_requests > 1000) {
          console.log(chalk.green('• High demand content'));
        } else if (analytics.total_requests > 100) {
          console.log(chalk.yellow('• Moderate demand content'));
        } else {
          console.log(chalk.gray('• Low demand content'));
        }

        // Time since last access
        const daysSinceAccess = (Date.now() - analytics.last_accessed * 1000) / (1000 * 60 * 60 * 24);
        if (daysSinceAccess < 1) {
          console.log(chalk.green('• Recently accessed (< 1 day ago)'));
        } else if (daysSinceAccess < 7) {
          console.log(chalk.yellow(`• Last accessed ${Math.floor(daysSinceAccess)} days ago`));
        } else {
          console.log(chalk.red(`• Stale content (${Math.floor(daysSinceAccess)} days since last access)`));
        }

      } catch (error) {
        spinner.fail(`Failed to get blob analytics: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Blob analytics error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// Prometheus metrics command
analyticsCommand
  .command('prometheus')
  .description('Export Prometheus metrics')
  .option('-o, --output <file>', 'output file (prints to stdout if not specified)')
  .action(async (options) => {
    try {
      const client = getWCDNClient();
      
      const spinner = ora('Fetching Prometheus metrics...').start();
      
      try {
        const metrics = await client.getPrometheusMetrics();
        spinner.succeed('Prometheus metrics retrieved');

        if (options.output) {
          const fs = await import('fs-extra');
          await fs.writeFile(options.output, metrics);
          log(`Metrics exported to ${options.output}`, 'success');
        } else {
          console.log(metrics);
        }

      } catch (error) {
        spinner.fail(`Failed to get Prometheus metrics: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Prometheus metrics error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// List analytics command
analyticsCommand
  .command('list')
  .description('List analytics for multiple blobs')
  .option('-l, --limit <num>', 'number of entries to show', parseInt, 20)
  .option('--period <period>', 'time period (1h, 24h, 7d, 30d)', '24h')
  .option('--format <format>', 'output format (table, json)', 'table')
  .action(async (options) => {
    try {
      const client = getWCDNClient();
      
      const spinner = ora('Fetching analytics list...').start();
      
      try {
        const result = await client.listAnalytics({
          limit: options.limit,
          period: options.period,
        });
        
        spinner.succeed(`Found ${result.data.length} analytics entries`);

        if (result.data.length === 0) {
          console.log(chalk.yellow('No analytics data found'));
          return;
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(chalk.bold(`\n📊 Analytics (${options.period} period):`));
          const analyticsData = [
            ['Blob ID', 'Requests', 'Hit Rate', 'Bytes Served', 'Last Access'],
            ...result.data.map(entry => [
              entry.blob_id.slice(0, 20) + '...',
              entry.total_requests.toLocaleString(),
              `${(entry.cache_hits / entry.total_requests * 100).toFixed(1)}%`,
              formatBytes(entry.total_bytes_served),
              new Date(entry.last_accessed * 1000).toLocaleDateString(),
            ]),
          ];

          console.log(table(analyticsData, {
            header: {
              alignment: 'center',
              content: chalk.blue(`Analytics Summary (${options.period})`),
            },
          }));

          if (result.has_more) {
            console.log(chalk.gray(`\nShowing ${result.data.length} entries. Use --limit to show more.`));
          }

          // Summary statistics
          const totalRequests = result.data.reduce((sum, entry) => sum + entry.total_requests, 0);
          const totalHits = result.data.reduce((sum, entry) => sum + entry.cache_hits, 0);
          const totalBytes = result.data.reduce((sum, entry) => sum + entry.total_bytes_served, 0);

          console.log(chalk.bold('\n📈 Summary:'));
          console.log(`Total requests: ${totalRequests.toLocaleString()}`);
          console.log(`Overall hit rate: ${(totalHits / totalRequests * 100).toFixed(2)}%`);
          console.log(`Total bytes served: ${formatBytes(totalBytes)}`);
        }

      } catch (error) {
        spinner.fail(`Failed to list analytics: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Analytics list error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });