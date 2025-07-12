import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import ora from 'ora';
import { getWCDNClient, log, verbose, formatBytes, formatDuration } from '../utils/config.js';

export const statusCommand = new Command('status')
  .description('Check blob status and health')
  .argument('[blob-id]', 'blob ID to check status for')
  .option('-a, --all-chains', 'check status on all supported chains')
  .option('-c, --chain <chain>', 'specific chain to check (ethereum, sui, solana)')
  .option('--cache-only', 'only check cache status')
  .option('--blockchain-only', 'only check blockchain status')
  .option('--aggregators-only', 'only check aggregator status')
  .option('-w, --watch', 'watch status changes')
  .option('--interval <seconds>', 'watch interval in seconds', parseInt, 5)
  .action(async (blobId, options) => {
    try {
      const client = getWCDNClient();

      if (!blobId) {
        // Show service health if no blob ID provided
        await showServiceHealth(client, options);
        return;
      }

      if (options.watch) {
        await watchBlobStatus(client, blobId, options);
      } else {
        await showBlobStatus(client, blobId, options);
      }

    } catch (error) {
      log(`Status check error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

async function showServiceHealth(client: any, options: any) {
  console.log(chalk.bold('WCDN Service Health\n'));

  const spinner = ora('Checking service health...').start();

  try {
    // Check basic health
    const isHealthy = await client.healthCheck();
    
    if (isHealthy) {
      spinner.succeed('Service is healthy');
    } else {
      spinner.fail('Service is unhealthy');
      return;
    }

    // Get global analytics
    const analytics = await client.getGlobalAnalytics();
    
    // Get cache stats
    const cacheStats = await client.getCacheStats();

    // Display service overview
    console.log(chalk.bold('\nService Overview:'));
    const serviceData = [
      ['Metric', 'Value'],
      ['Total Requests', analytics.global.total_requests.toLocaleString()],
      ['Cache Hit Rate', `${(analytics.global.cache_hits / analytics.global.total_requests * 100).toFixed(2)}%`],
      ['Unique Blobs', analytics.global.unique_cids.toLocaleString()],
      ['Total Bytes Served', formatBytes(analytics.global.total_bytes_served)],
      ['Uptime', formatDuration(analytics.global.uptime * 1000)],
    ];

    console.log(table(serviceData, {
      header: {
        alignment: 'center',
        content: chalk.cyan('Service Statistics'),
      },
    }));

    // Display cache status
    console.log(chalk.bold('\nCache Status:'));
    const cacheData = [
      ['Metric', 'Value'],
      ['Total Entries', cacheStats.total_entries.toLocaleString()],
      ['Total Size', formatBytes(cacheStats.total_size_bytes)],
      ['Pinned Entries', cacheStats.pinned_entries.toLocaleString()],
      ['Memory Usage', `${cacheStats.memory_usage_mb.toFixed(2)} MB`],
      ['Redis Connected', cacheStats.redis_connected ? '✓ Yes' : '✗ No'],
      ['Hit Rate', `${(cacheStats.hit_rate * 100).toFixed(2)}%`],
    ];

    console.log(table(cacheData, {
      header: {
        alignment: 'center',
        content: chalk.green('Cache Statistics'),
      },
    }));

    // Display top blobs
    if (analytics.top_blobs?.length > 0) {
      console.log(chalk.bold('\nTop Requested Blobs:'));
      const topBlobsData = [
        ['Rank', 'Blob ID', 'Requests'],
        ...analytics.top_blobs.slice(0, 10).map((blob, index) => [
          (index + 1).toString(),
          blob.cid.slice(0, 20) + '...',
          blob.requests.toLocaleString(),
        ]),
      ];

      console.log(table(topBlobsData, {
        header: {
          alignment: 'center',
          content: chalk.yellow('Popular Content'),
        },
      }));
    }

    // Check blockchain integration
    if (client.isBlockchainIntegrationAvailable()) {
      const supportedChains = client.getSupportedChains();
      console.log(chalk.bold('\nBlockchain Integration:'));
      console.log(`Supported chains: ${supportedChains.map(c => chalk.cyan(c)).join(', ')}`);
      
      // Check node health for each chain
      for (const chain of supportedChains) {
        const nodeSpinner = ora(`Checking ${chain} nodes...`).start();
        try {
          await client.healthCheckNodes(chain);
          nodeSpinner.succeed(`${chain} nodes healthy`);
        } catch (error) {
          nodeSpinner.fail(`${chain} nodes unhealthy: ${error.message}`);
        }
      }
    } else {
      console.log(chalk.yellow('\nBlockchain integration not configured'));
    }

  } catch (error) {
    spinner.fail(`Health check failed: ${error.message}`);
    throw error;
  }
}

async function showBlobStatus(client: any, blobId: string, options: any) {
  console.log(chalk.bold(`Blob Status: ${blobId}\n`));

  const spinner = ora('Checking blob status...').start();

  try {
    const checks = [];

    // Cache status
    if (!options.blockchainOnly && !options.aggregatorsOnly) {
      checks.push(
        client.getBlob(blobId).catch((error) => ({ error: error.message }))
      );
    }

    // Blockchain status
    if (!options.cacheOnly && !options.aggregatorsOnly && client.isBlockchainIntegrationAvailable()) {
      const chain = options.chain;
      checks.push(
        client.getBlobMetadataFromChain(blobId, chain).catch((error) => ({ error: error.message }))
      );
    }

    // Aggregator status
    if (!options.cacheOnly && !options.blockchainOnly) {
      const chains = options.allChains ? undefined : (options.chain ? [options.chain] : undefined);
      checks.push(
        client.getMultiChainBlobStatus(blobId, chains).catch((error) => ({ error: error.message }))
      );
    }

    const [cacheStatus, blockchainStatus, aggregatorStatus] = await Promise.all(checks);

    spinner.succeed('Status check completed');

    // Display cache status
    if (cacheStatus && !cacheStatus.error) {
      console.log(chalk.bold('\nWCDN Cache Status:'));
      const cacheData = [
        ['Property', 'Value'],
        ['Cached', cacheStatus.cached ? '✓ Yes' : '✗ No'],
        ['Pinned', cacheStatus.pinned ? '✓ Yes' : '✗ No'],
        ['Size', formatBytes(cacheStatus.size)],
        ['Content Type', cacheStatus.content_type],
        ['Cache Date', cacheStatus.cache_date ? new Date(cacheStatus.cache_date * 1000).toISOString() : 'N/A'],
        ['TTL', cacheStatus.ttl ? `${cacheStatus.ttl}s` : 'N/A'],
      ];

      console.log(table(cacheData, {
        header: {
          alignment: 'center',
          content: chalk.green('Cache Information'),
        },
      }));
    } else if (cacheStatus?.error) {
      console.log(chalk.red(`\nCache error: ${cacheStatus.error}`));
    }

    // Display blockchain status
    if (blockchainStatus && !blockchainStatus.error) {
      console.log(chalk.bold('\nBlockchain Registration:'));
      const blockchainData = [['Chain', 'Status', 'Uploader', 'Pinned', 'Timestamp']];

      for (const [chain, data] of Object.entries(blockchainStatus)) {
        if (data) {
          blockchainData.push([
            chain.charAt(0).toUpperCase() + chain.slice(1),
            '✓ Registered',
            `${data.uploader.slice(0, 8)}...`,
            data.isPinned ? '✓ Yes' : '✗ No',
            new Date(data.timestamp * 1000).toISOString().split('T')[0],
          ]);
        } else {
          blockchainData.push([
            chain.charAt(0).toUpperCase() + chain.slice(1),
            '✗ Not Registered',
            'N/A',
            'N/A',
            'N/A',
          ]);
        }
      }

      console.log(table(blockchainData, {
        header: {
          alignment: 'center',
          content: chalk.blue('Blockchain Status'),
        },
      }));
    } else if (blockchainStatus?.error) {
      console.log(chalk.red(`\nBlockchain error: ${blockchainStatus.error}`));
    }

    // Display aggregator status
    if (aggregatorStatus && !aggregatorStatus.error) {
      console.log(chalk.bold('\nMulti-Chain Aggregator Status:'));
      const aggregatorData = [['Chain', 'Status', 'Endpoint', 'Latency', 'Last Checked']];

      for (const [chain, data] of Object.entries(aggregatorStatus.chains)) {
        aggregatorData.push([
          chain.charAt(0).toUpperCase() + chain.slice(1),
          data.exists ? '✓ Available' : '✗ Not Found',
          data.endpoint.split('//')[1]?.split('.')[0] || 'Unknown',
          data.latency ? `${data.latency}ms` : 'N/A',
          new Date(data.lastChecked).toLocaleTimeString(),
        ]);
      }

      console.log(table(aggregatorData, {
        header: {
          alignment: 'center',
          content: chalk.yellow('Aggregator Availability'),
        },
      }));

      if (aggregatorStatus.summary.bestChain) {
        console.log(chalk.green(`\nBest performing chain: ${aggregatorStatus.summary.bestChain}`));
        console.log(`Available on ${aggregatorStatus.summary.availableChains.length}/${aggregatorStatus.summary.totalChains} chains`);
      }
    } else if (aggregatorStatus?.error) {
      console.log(chalk.red(`\nAggregator error: ${aggregatorStatus.error}`));
    }

  } catch (error) {
    spinner.fail(`Status check failed: ${error.message}`);
    throw error;
  }
}

async function watchBlobStatus(client: any, blobId: string, options: any) {
  console.log(chalk.bold(`Watching blob status: ${blobId}`));
  console.log(chalk.gray(`Update interval: ${options.interval}s (Press Ctrl+C to stop)\n`));

  let iteration = 0;

  const watchInterval = setInterval(async () => {
    try {
      iteration++;
      console.clear();
      console.log(chalk.bold(`Blob Status Watch - Update #${iteration}`));
      console.log(chalk.gray(`Blob ID: ${blobId}`));
      console.log(chalk.gray(`Time: ${new Date().toLocaleString()}\n`));

      await showBlobStatus(client, blobId, options);

    } catch (error) {
      log(`Watch error: ${error.message}`, 'error');
    }
  }, options.interval * 1000);

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(watchInterval);
    console.log(chalk.yellow('\nWatch stopped'));
    process.exit(0);
  });

  // Initial check
  await showBlobStatus(client, blobId, options);
}