import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import ora from 'ora';
import inquirer from 'inquirer';
import { getWCDNClient, getConfig, log, verbose, formatBytes } from '../utils/config.js';

export const blockchainCommand = new Command('blockchain')
  .alias('bc')
  .description('Manage blockchain operations');

// Status command
blockchainCommand
  .command('status')
  .description('Check blockchain integration status')
  .option('-c, --chain <chain>', 'specific chain to check')
  .action(async (options) => {
    try {
      const client = getWCDNClient();
      const config = getConfig();

      console.log(chalk.bold('🔗 Blockchain Integration Status\n'));

      // Check if blockchain integration is available
      if (!client.isBlockchainIntegrationAvailable()) {
        console.log(chalk.red('❌ Blockchain integration not configured'));
        console.log(chalk.gray('Run "wcdn config blockchain" to set up blockchain integration'));
        return;
      }

      // Get supported chains
      const supportedChains = client.getSupportedChains();
      console.log(chalk.green('✅ Blockchain integration enabled'));
      console.log(`Supported chains: ${supportedChains.map(c => chalk.cyan(c)).join(', ')}\n`);

      // Check each chain status
      for (const chain of supportedChains) {
        if (options.chain && options.chain !== chain) continue;

        console.log(chalk.bold(`${chain.toUpperCase()} Status:`));
        
        const spinner = ora(`Checking ${chain} integration...`).start();
        
        try {
          // Test basic connectivity
          await client.healthCheckNodes(chain);
          spinner.succeed(`${chain} nodes healthy`);

          // Show configuration details
          const chainConfig = config.blockchain?.[chain];
          if (chainConfig) {
            const configData = [
              ['Property', 'Value'],
              ['Network', chainConfig.network || 'N/A'],
              ['RPC URL', chainConfig.rpcUrl ? '✓ Configured' : '✗ Not configured'],
              ['Contract/Package', chainConfig.contractAddress || chainConfig.packageId || 'N/A'],
              ['Private Key', chainConfig.privateKey ? '✓ Available (Write operations enabled)' : '✗ Not available (Read-only)'],
            ];

            console.log(table(configData, {
              header: {
                alignment: 'center',
                content: chalk.blue(`${chain.toUpperCase()} Configuration`),
              },
            }));
          }

        } catch (error) {
          spinner.fail(`${chain} integration error: ${error.message}`);
        }

        console.log(''); // Add spacing
      }

    } catch (error) {
      log(`Blockchain status error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// Register command
blockchainCommand
  .command('register')
  .description('Register blob metadata on blockchain')
  .argument('<blob-id>', 'blob ID to register')
  .option('-c, --chain <chain>', 'target blockchain (ethereum, sui, solana)')
  .option('-s, --size <bytes>', 'file size in bytes', parseInt)
  .option('-t, --content-type <type>', 'MIME content type')
  .option('--content-hash <hash>', 'content hash for verification')
  .option('-y, --yes', 'skip confirmation prompts')
  .action(async (blobId, options) => {
    try {
      const client = getWCDNClient();
      const config = getConfig();

      if (!client.isBlockchainIntegrationAvailable()) {
        log('Blockchain integration not configured', 'error');
        return;
      }

      const chain = options.chain || config.defaults?.chain || 'ethereum';
      
      if (!client.getSupportedChains().includes(chain)) {
        log(`Chain "${chain}" not configured`, 'error');
        return;
      }

      // Get blob information if not provided
      let metadata = {
        size: options.size,
        contentType: options.contentType,
        contentHash: options.contentHash,
      };

      if (!metadata.size || !metadata.contentType) {
        console.log(chalk.blue('Fetching blob information from WCDN...'));
        try {
          const blobInfo = await client.getBlob(blobId);
          metadata.size = metadata.size || blobInfo.size;
          metadata.contentType = metadata.contentType || blobInfo.content_type;
          metadata.contentHash = metadata.contentHash || blobId; // Fallback to blob ID
        } catch (error) {
          log(`Failed to fetch blob information: ${error.message}`, 'error');
          
          // Prompt for missing information
          const missingInfo = await inquirer.prompt([
            {
              type: 'number',
              name: 'size',
              message: 'File size (bytes):',
              when: () => !metadata.size,
              validate: (input) => input > 0 || 'Size must be positive',
            },
            {
              type: 'input',
              name: 'contentType',
              message: 'Content type:',
              default: 'application/octet-stream',
              when: () => !metadata.contentType,
            },
            {
              type: 'input',
              name: 'contentHash',
              message: 'Content hash:',
              default: blobId,
              when: () => !metadata.contentHash,
            },
          ]);

          metadata = { ...metadata, ...missingInfo };
        }
      }

      const cdnUrl = client.getCDNUrl(blobId);

      // Show registration summary
      console.log(chalk.bold('\nRegistration Summary:'));
      console.log(`Blob ID: ${chalk.cyan(blobId)}`);
      console.log(`Chain: ${chalk.yellow(chain)}`);
      console.log(`Size: ${formatBytes(metadata.size)}`);
      console.log(`Content Type: ${metadata.contentType}`);
      console.log(`CDN URL: ${cdnUrl}`);
      console.log(`Content Hash: ${metadata.contentHash}`);

      // Confirm registration
      if (!options.yes) {
        const { proceed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: `Register blob on ${chain} blockchain?`,
            default: true,
          },
        ]);

        if (!proceed) {
          log('Registration cancelled', 'warning');
          return;
        }
      }

      // Perform registration
      const spinner = ora(`Registering blob on ${chain}...`).start();
      
      try {
        const txHashes = await client.registerBlobOnChain(
          blobId,
          {
            size: metadata.size,
            contentType: metadata.contentType,
            cdnUrl,
            contentHash: metadata.contentHash,
          },
          chain
        );

        const txHash = txHashes[chain];
        if (txHash) {
          spinner.succeed(`Blob registered successfully on ${chain}`);
          console.log(chalk.bold('\nTransaction Details:'));
          console.log(`Transaction Hash: ${chalk.green(txHash)}`);
          console.log(`Chain: ${chain}`);
          console.log(`Block Explorer: ${getBlockExplorerUrl(chain, txHash)}`);
        } else {
          spinner.fail('Registration failed - no transaction hash returned');
        }

      } catch (error) {
        spinner.fail(`Registration failed: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Registration error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// Query command
blockchainCommand
  .command('query')
  .description('Query blob metadata from blockchain')
  .argument('<blob-id>', 'blob ID to query')
  .option('-c, --chain <chain>', 'specific chain to query')
  .option('--format <format>', 'output format (table, json)', 'table')
  .action(async (blobId, options) => {
    try {
      const client = getWCDNClient();

      if (!client.isBlockchainIntegrationAvailable()) {
        log('Blockchain integration not configured', 'error');
        return;
      }

      const spinner = ora(`Querying blob metadata from blockchain...`).start();
      
      try {
        const metadata = await client.getBlobMetadataFromChain(blobId, options.chain);
        spinner.succeed('Query completed');

        if (options.format === 'json') {
          console.log(JSON.stringify(metadata, null, 2));
          return;
        }

        console.log(chalk.bold(`\n📋 Blockchain Metadata for: ${blobId}\n`));

        let hasData = false;
        for (const [chain, data] of Object.entries(metadata)) {
          if (!data) continue;
          hasData = true;

          console.log(chalk.bold(`${chain.toUpperCase()} Metadata:`));
          const chainData = [
            ['Property', 'Value'],
            ['Blob ID', data.blobId],
            ['Uploader', data.uploader],
            ['Size', formatBytes(data.size)],
            ['Content Type', data.contentType],
            ['Timestamp', new Date(data.timestamp * 1000).toLocaleString()],
            ['CDN URL', data.cdnUrl],
            ['Pinned', data.isPinned ? '✓ Yes' : '✗ No'],
            ['Content Hash', data.contentHash],
          ];

          console.log(table(chainData, {
            header: {
              alignment: 'center',
              content: chalk.blue(`${chain.toUpperCase()} Registry`),
            },
          }));
          console.log('');
        }

        if (!hasData) {
          console.log(chalk.yellow('No blockchain metadata found for this blob'));
          console.log(chalk.gray('Use "wcdn blockchain register" to register it'));
        }

      } catch (error) {
        spinner.fail(`Query failed: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Query error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// Pin command
blockchainCommand
  .command('pin')
  .description('Pin blob on blockchain to prevent cache eviction')
  .argument('<blob-id>', 'blob ID to pin')
  .option('-c, --chain <chain>', 'target blockchain')
  .action(async (blobId, options) => {
    try {
      const client = getWCDNClient();
      const config = getConfig();

      if (!client.isBlockchainIntegrationAvailable()) {
        log('Blockchain integration not configured', 'error');
        return;
      }

      const chain = options.chain || config.defaults?.chain || 'ethereum';
      
      const spinner = ora(`Pinning blob on ${chain}...`).start();
      
      try {
        const txHash = await client.pinBlobOnChain(blobId, chain);
        spinner.succeed(`Blob pinned successfully on ${chain}`);
        
        console.log(chalk.bold('\nTransaction Details:'));
        console.log(`Transaction Hash: ${chalk.green(txHash)}`);
        console.log(`Chain: ${chain}`);
        console.log(`Block Explorer: ${getBlockExplorerUrl(chain, txHash)}`);

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

// Verify command
blockchainCommand
  .command('verify')
  .description('Verify blob content hash on blockchain')
  .argument('<blob-id>', 'blob ID to verify')
  .argument('<content-hash>', 'content hash to verify')
  .option('-c, --chain <chain>', 'target blockchain')
  .action(async (blobId, contentHash, options) => {
    try {
      const client = getWCDNClient();
      const config = getConfig();

      if (!client.isBlockchainIntegrationAvailable()) {
        log('Blockchain integration not configured', 'error');
        return;
      }

      const chain = options.chain || config.defaults?.chain || 'ethereum';
      
      const spinner = ora(`Verifying blob hash on ${chain}...`).start();
      
      try {
        const isValid = await client.verifyBlobHashOnChain(blobId, contentHash, chain);
        
        if (isValid) {
          spinner.succeed(`Hash verification successful on ${chain}`);
          console.log(chalk.green('✅ Content hash matches blockchain record'));
        } else {
          spinner.fail(`Hash verification failed on ${chain}`);
          console.log(chalk.red('❌ Content hash does not match blockchain record'));
        }

      } catch (error) {
        spinner.fail(`Verification failed: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`Verification error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// List user blobs command
blockchainCommand
  .command('list-user-blobs')
  .description('List blobs uploaded by a specific address')
  .argument '<address>', 'uploader address'
  .option('-c, --chain <chain>', 'target blockchain')
  .action(async (address, options) => {
    try {
      const client = getWCDNClient();
      const config = getConfig();

      if (!client.isBlockchainIntegrationAvailable()) {
        log('Blockchain integration not configured', 'error');
        return;
      }

      const chain = options.chain || config.defaults?.chain || 'ethereum';
      
      const spinner = ora(`Fetching blobs for address ${address} on ${chain}...`).start();
      
      try {
        const blobIds = await client.getUploaderBlobsFromChain(address, chain);
        spinner.succeed(`Found ${blobIds.length} blobs for address`);

        if (blobIds.length === 0) {
          console.log(chalk.yellow('No blobs found for this address'));
          return;
        }

        console.log(chalk.bold(`\n📁 Blobs uploaded by ${address} on ${chain}:\n`));
        
        const blobData = [
          ['#', 'Blob ID', 'CDN URL'],
          ...blobIds.map((blobId, index) => [
            (index + 1).toString(),
            blobId.slice(0, 20) + '...',
            client.getCDNUrl(blobId),
          ]),
        ];

        console.log(table(blobData, {
          header: {
            alignment: 'center',
            content: chalk.blue(`User Blobs (${chain.toUpperCase()})`),
          },
        }));

      } catch (error) {
        spinner.fail(`Failed to fetch user blobs: ${error.message}`);
        throw error;
      }

    } catch (error) {
      log(`List user blobs error: ${error.message}`, 'error');
      verbose(error.stack);
      process.exit(1);
    }
  });

// Helper function to get block explorer URLs
function getBlockExplorerUrl(chain: string, txHash: string): string {
  const explorers = {
    ethereum: `https://etherscan.io/tx/${txHash}`,
    sui: `https://explorer.sui.io/txblock/${txHash}`,
    solana: `https://explorer.solana.com/tx/${txHash}`,
  };

  return explorers[chain] || `Transaction: ${txHash}`;
}