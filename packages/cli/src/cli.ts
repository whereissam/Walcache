#!/usr/bin/env node

/**
 * Walcache CLI - Developer platform for Walrus decentralized storage
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { config } from 'dotenv'
import { uploadCommand } from './commands/upload.js'
import { deployCommand } from './commands/deploy.js'
import { statusCommand } from './commands/status.js'
import { cacheCommand } from './commands/cache.js'
import { analyticsCommand } from './commands/analytics.js'
import { blockchainCommand } from './commands/blockchain.js'
import { configCommand } from './commands/config.js'
import { initCommand } from './commands/init.js'
import { loadConfig } from './utils/config.js'

// Load environment variables
config()

const program = new Command()

// CLI Metadata
program
  .name('walcache')
  .description('Walcache — Developer platform for Walrus decentralized storage')
  .version('1.0.0')
  .option('-c, --config <path>', 'path to config file', '.wcdn.json')
  .option('-v, --verbose', 'enable verbose logging')
  .option('--api-key <key>', 'API key (overrides config)')
  .option('--base-url <url>', 'base URL (overrides config)')
  .hook('preAction', async (thisCommand) => {
    const options = thisCommand.opts()

    if (options.verbose) {
      process.env.WCDN_VERBOSE = 'true'
    }

    // Load configuration
    try {
      await loadConfig(options.config)
    } catch (error: any) {
      if (thisCommand.name() !== 'init') {
        console.error(chalk.red('Error loading config:'), error.message)
        console.log(
          chalk.yellow('Run "walcache init" to create a configuration file.'),
        )
        process.exit(1)
      }
    }
  })

// Commands
program
  .addCommand(initCommand)
  .addCommand(configCommand)
  .addCommand(uploadCommand)
  .addCommand(deployCommand)
  .addCommand(statusCommand)
  .addCommand(cacheCommand)
  .addCommand(analyticsCommand)
  .addCommand(blockchainCommand)

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Fatal error:'), error.message)
  if (process.env.WCDN_VERBOSE) {
    console.error(error.stack)
  }
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error(
    chalk.red('Unhandled rejection at:'),
    promise,
    'reason:',
    reason,
  )
  process.exit(1)
})

// Parse CLI arguments
program.parse()
