#!/usr/bin/env node

/**
 * WCDN CLI - Command-line interface for Walrus Content Delivery Network
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import { WalrusCDNClient } from '@wcdn/sdk';
import { PRESET_CONFIGS } from '@wcdn/sdk/blockchain';
import { uploadCommand } from './commands/upload.js';
import { statusCommand } from './commands/status.js';
import { cacheCommand } from './commands/cache.js';
import { analyticsCommand } from './commands/analytics.js';
import { blockchainCommand } from './commands/blockchain.js';
import { configCommand } from './commands/config.js';
import { initCommand } from './commands/init.js';
import { loadConfig, getWCDNClient } from './utils/config.js';

// Load environment variables
config();

const program = new Command();

// CLI Metadata
program
  .name('wcdn')
  .description('CLI for WCDN (Walrus Content Delivery Network)')
  .version('1.0.0')
  .option('-c, --config <path>', 'path to config file', '.wcdn.json')
  .option('-v, --verbose', 'enable verbose logging')
  .option('--api-key <key>', 'WCDN API key (overrides config)')
  .option('--base-url <url>', 'WCDN base URL (overrides config)')
  .hook('preAction', async (thisCommand) => {
    const options = thisCommand.opts();
    
    if (options.verbose) {
      process.env.WCDN_VERBOSE = 'true';
    }

    // Load configuration
    try {
      await loadConfig(options.config);
    } catch (error) {
      if (thisCommand.name() !== 'init') {
        console.error(chalk.red('Error loading config:'), error.message);
        console.log(chalk.yellow('Run "wcdn init" to create a configuration file.'));
        process.exit(1);
      }
    }
  });

// Commands
program
  .addCommand(initCommand)
  .addCommand(configCommand)
  .addCommand(uploadCommand)
  .addCommand(statusCommand)
  .addCommand(cacheCommand)
  .addCommand(analyticsCommand)
  .addCommand(blockchainCommand);

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Fatal error:'), error.message);
  if (process.env.WCDN_VERBOSE) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

// Parse CLI arguments
program.parse();