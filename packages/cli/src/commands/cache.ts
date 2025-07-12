import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import ora from 'ora';
import inquirer from 'inquirer';
import { getWCDNClient, log, verbose, formatBytes } from '../utils/config.js';

export const cacheCommand = new Command('cache')
  .description('Manage WCDN cache operations');

// Preload command
cacheCommand
  .command('preload')
  .description('Preload blobs into cache')
  .argument('[blob-ids...]', 'blob IDs to preload')
  .option('-f, --file <path>', 'read blob IDs from file (one per line)')
  .option('-y, --yes', 'skip confirmation prompts')
  .action(async (blobIds, options) => {
    try {
      const client = getWCDNClient();
      
      // Get blob IDs to preload
      let idsToPreload = [...blobIds];
      
      if (options.file) {
        const fs = await import('fs-extra');
        const fileContent = await fs.readFile(options.file, 'utf-8');
        const fileIds = fileContent.split('\n').map(line => line.trim()).filter(Boolean);
        idsToPreload.push(...fileIds);
      }

      if (idsToPreload.length === 0) {
        const { blobIdInput } = await inquirer.prompt([
          {
            type: 'input',
            name: 'blobIdInput',
            message: 'Enter blob IDs to preload (space-separated):',
            validate: (input) => input.trim().length > 0 || 'Please enter at least one blob ID',
          },
        ]);
        
        idsToPreload = blobIdInput.trim().split(/\s+/);
      }

      // Remove duplicates
      idsToPreload = [...new Set(idsToPreload)];

      console.log(chalk.bold(`\nPreloading ${idsToPreload.length} blobs into cache:`));
      idsToPreload.forEach((id, index) => {
        console.log(`${index + 1}. ${id}`);
      });

      // Confirm operation
      if (!options.yes) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Proceed with preload?',
            default: true,
          },
        ]);

        if (!proceed) {
          log('Preload cancelled', 'warning');
          return;
        }
      }

      // Perform preload
      const spinner = ora('Preloading blobs...').start();
      
      try {
        const result = await client.preloadBlobs(idsToPreload);
        spinner.succeed(`Preload completed: ${result.cached} cached, ${result.errors} errors`);

        // Show detailed results
        if (result.successful.length > 0) {
          console.log(chalk.bold('\n✅ Successfully Cached:'));
          const successData = [
            ['Blob ID', 'Status', 'Size'],
            ...result.successful.map(item => [
              item.blob_id.slice(0, 20) + '...',
              item.status === 'cached' ? '📥 Cached' : '✓ Already Cached',
              item.size ? formatBytes(item.size) : 'N/A',
            ]),
          ];

          console.log(table(successData, {
            header: {
              alignment: 'center',
              content: chalk.green('Successful Operations'),
            },
          }));
        }

        if (result.failed.length > 0) {
          console.log(chalk.bold('\n❌ Failed to Cache:'));
          const failedData = [
            ['Blob ID', 'Error'],
            ...result.failed.map(item => [
              item.blob_id.slice(0, 20) + '...',
              item.error,
            ]),
          ];

          console.log(table(failedData, {
            header: {
              alignment: 'center',
              content: chalk.red('Failed Operations'),
            },
          }));
        }

      } catch (error) {
        spinner.fail(`Preload failed: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Preload error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// Clear command
cacheCommand
  .command('clear')
  .description('Clear cache entries')
  .argument('[blob-ids...]', 'specific blob IDs to clear (clears all if none provided)')
  .option('-y, --yes', 'skip confirmation prompts')
  .option('--all', 'clear all cache entries')
  .action(async (blobIds, options) => {
    try {
      const client = getWCDNClient();
      
      const clearAll = options.all || blobIds.length === 0;
      
      if (clearAll) {
        console.log(chalk.bold.red('⚠️  WARNING: This will clear ALL cache entries!'));
      } else {
        console.log(chalk.bold(`Clearing ${blobIds.length} specific cache entries:`));
        blobIds.forEach((id, index) => {
          console.log(`${index + 1}. ${id}`);
        });
      }

      // Confirm operation
      if (!options.yes) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: clearAll ? 'Clear ALL cache entries?' : 'Clear specified cache entries?',
            default: false,
          },
        ]);

        if (!proceed) {
          log('Cache clear cancelled', 'warning');
          return;
        }
      }

      // Perform clear
      const spinner = ora(clearAll ? 'Clearing all cache...' : 'Clearing cache entries...').start();
      
      try {
        const result = await client.clearCache(clearAll ? undefined : blobIds);
        
        if (clearAll) {
          spinner.succeed('All cache entries cleared');
          console.log(chalk.green(`Status: ${result.status}`));
          if (result.message) {
            console.log(`Message: ${result.message}`);
          }
        } else {
          spinner.succeed(`Cache clear completed: ${result.cleared || 0} cleared`);
          
          if (result.successful?.length > 0) {
            console.log(chalk.bold('\n✅ Successfully Cleared:'));
            result.successful.forEach(item => {
              console.log(`• ${item.blob_id}`);
            });
          }

          if (result.failed?.length > 0) {
            console.log(chalk.bold('\n❌ Failed to Clear:'));
            result.failed.forEach(item => {
              console.log(`• ${item.blob_id}: ${item.error}`);
            });
          }
        }

      } catch (error) {
        spinner.fail(`Cache clear failed: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Cache clear error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// Pin command
cacheCommand
  .command('pin')
  .description('Pin blob to prevent cache eviction')
  .argument('<blob-id>', 'blob ID to pin')
  .action(async (blobId) => {
    try {
      const client = getWCDNClient();
      
      const spinner = ora(`Pinning blob ${blobId}...`).start();
      
      try {
        const result = await client.pinBlob(blobId);
        spinner.succeed(`Blob pinned successfully`);
        
        console.log(chalk.bold('\nBlob Information:'));
        console.log(`ID: ${result.id}`);
        console.log(`Size: ${formatBytes(result.size)}`);
        console.log(`Content Type: ${result.content_type}`);
        console.log(`Pinned: ${result.pinned ? '✓ Yes' : '✗ No'}`);

      } catch (error) {
        spinner.fail(`Pin failed: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Pin error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// Unpin command
cacheCommand
  .command('unpin')
  .description('Unpin blob to allow cache eviction')
  .argument('<blob-id>', 'blob ID to unpin')
  .action(async (blobId) => {
    try {
      const client = getWCDNClient();
      
      const spinner = ora(`Unpinning blob ${blobId}...`).start();
      
      try {
        const result = await client.unpinBlob(blobId);
        spinner.succeed(`Blob unpinned successfully`);
        
        console.log(chalk.bold('\nBlob Information:'));
        console.log(`ID: ${result.id}`);
        console.log(`Size: ${formatBytes(result.size)}`);
        console.log(`Content Type: ${result.content_type}`);
        console.log(`Pinned: ${result.pinned ? '✓ Yes' : '✗ No'}`);

      } catch (error) {
        spinner.fail(`Unpin failed: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Unpin error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// Stats command
cacheCommand
  .command('stats')
  .description('Show cache statistics')
  .action(async () => {
    try {
      const client = getWCDNClient();
      
      const spinner = ora('Fetching cache statistics...').start();
      
      try {
        const stats = await client.getCacheStats();
        spinner.succeed('Cache statistics retrieved');

        console.log(chalk.bold('\nCache Statistics:'));
        const statsData = [
          ['Metric', 'Value'],
          ['Total Entries', stats.total_entries.toLocaleString()],
          ['Total Size', formatBytes(stats.total_size_bytes)],
          ['Pinned Entries', stats.pinned_entries.toLocaleString()],
          ['Memory Usage', `${stats.memory_usage_mb.toFixed(2)} MB`],
          ['Redis Connected', stats.redis_connected ? '✓ Yes' : '✗ No'],
          ['Hit Rate', `${(stats.hit_rate * 100).toFixed(2)}%`],
          ['Created', new Date(stats.created * 1000).toLocaleString()],
        ];

        console.log(table(statsData, {
          header: {
            alignment: 'center',
            content: chalk.blue('Cache Statistics'),
          },
        }));

        // Calculate derived metrics
        const pinnedPercentage = stats.total_entries > 0 ? (stats.pinned_entries / stats.total_entries * 100).toFixed(2) : 0;
        const avgEntrySize = stats.total_entries > 0 ? (stats.total_size_bytes / stats.total_entries) : 0;

        console.log(chalk.bold('\nDerived Metrics:'));
        console.log(`Pinned entries: ${pinnedPercentage}% of total`);
        console.log(`Average entry size: ${formatBytes(avgEntrySize)}`);
        
        if (stats.hit_rate > 0.8) {
          console.log(chalk.green('✓ Cache performance is excellent'));
        } else if (stats.hit_rate > 0.6) {
          console.log(chalk.yellow('⚠ Cache performance is good but could be improved'));
        } else {
          console.log(chalk.red('⚠ Cache performance needs attention'));
        }

      } catch (error) {
        spinner.fail(`Failed to get cache statistics: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Cache stats error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// List command
cacheCommand
  .command('list')
  .description('List cache entries')
  .option('-l, --limit <num>', 'number of entries to show', parseInt, 20)
  .option('--pinned', 'show only pinned entries')
  .option('--format <format>', 'output format (table, json)', 'table')
  .action(async (options) => {
    try {
      const client = getWCDNClient();
      
      const spinner = ora('Fetching cache entries...').start();
      
      try {
        const result = await client.listCacheEntries({
          limit: options.limit,
          pinned: options.pinned,
        });
        
        spinner.succeed(`Found ${result.data.length} cache entries`);

        if (result.data.length === 0) {
          console.log(chalk.yellow('No cache entries found'));
          return;
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(chalk.bold('\nCache Entries:'));
          const entriesData = [
            ['Blob ID', 'Size', 'Pinned', 'TTL', 'Last Accessed'],
            ...result.data.map(entry => [
              entry.blob_id.slice(0, 20) + '...',
              formatBytes(entry.size),
              entry.pinned ? '📌 Yes' : '✗ No',
              entry.ttl > 0 ? `${entry.ttl}s` : 'Never',
              new Date(entry.last_accessed * 1000).toLocaleString(),
            ]),
          ];

          console.log(table(entriesData, {
            header: {
              alignment: 'center',
              content: chalk.blue('Cache Entries'),
            },
          }));

          if (result.has_more) {
            console.log(chalk.gray(`\nShowing ${result.data.length} entries. Use --limit to show more.`));
          }
        }

      } catch (error) {
        spinner.fail(`Failed to list cache entries: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Cache list error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });