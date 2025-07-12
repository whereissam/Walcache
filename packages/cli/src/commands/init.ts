import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { saveConfig, log } from '../utils/config.js';

export const initCommand = new Command('init')
  .description('Initialize WCDN configuration')
  .option('-f, --force', 'overwrite existing configuration')
  .option('--config <path>', 'config file path', '.wcdn.json')
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);
      
      // Check if config already exists
      if (await fs.pathExists(configPath) && !options.force) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Configuration file already exists at ${configPath}. Overwrite?`,
            default: false,
          },
        ]);

        if (!overwrite) {
          log('Configuration initialization cancelled', 'warning');
          return;
        }
      }

      console.log(chalk.bold('🚀 WCDN Configuration Setup\n'));

      // Basic configuration
      const basicConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'baseUrl',
          message: 'WCDN base URL:',
          default: 'http://localhost:4500',
          validate: (input) => {
            try {
              new URL(input);
              return true;
            } catch {
              return 'Please enter a valid URL';
            }
          },
        },
        {
          type: 'input',
          name: 'apiKey',
          message: 'API key (optional):',
        },
        {
          type: 'number',
          name: 'timeout',
          message: 'Request timeout (seconds):',
          default: 30,
          validate: (input) => input > 0 || 'Timeout must be positive',
        },
      ]);

      // Blockchain configuration
      const { enableBlockchain } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enableBlockchain',
          message: 'Enable blockchain integration?',
          default: false,
        },
      ]);

      let blockchainConfig = {};

      if (enableBlockchain) {
        const { chains } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'chains',
            message: 'Select blockchain networks to configure:',
            choices: [
              { name: 'Ethereum', value: 'ethereum' },
              { name: 'Sui', value: 'sui' },
              { name: 'Solana (Coming Soon)', value: 'solana', disabled: true },
            ],
          },
        ]);

        // Configure Ethereum
        if (chains.includes('ethereum')) {
          console.log(chalk.cyan('\n📱 Ethereum Configuration:'));
          const ethConfig = await inquirer.prompt([
            {
              type: 'list',
              name: 'network',
              message: 'Ethereum network:',
              choices: ['mainnet', 'sepolia'],
              default: 'sepolia',
            },
            {
              type: 'input',
              name: 'rpcUrl',
              message: 'Ethereum RPC URL:',
              default: (answers) => 
                answers.network === 'mainnet' 
                  ? 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY'
                  : 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
            },
            {
              type: 'input',
              name: 'contractAddress',
              message: 'WalrusBlobRegistry contract address:',
              validate: (input) => input.startsWith('0x') || 'Please enter a valid contract address',
            },
            {
              type: 'password',
              name: 'privateKey',
              message: 'Private key (optional, for writing operations):',
              mask: '*',
            },
          ]);

          blockchainConfig.ethereum = {
            network: ethConfig.network,
            rpcUrl: ethConfig.rpcUrl,
            contractAddress: ethConfig.contractAddress,
            ...(ethConfig.privateKey && { privateKey: ethConfig.privateKey }),
          };
        }

        // Configure Sui
        if (chains.includes('sui')) {
          console.log(chalk.cyan('\n🌊 Sui Configuration:'));
          const suiConfig = await inquirer.prompt([
            {
              type: 'list',
              name: 'network',
              message: 'Sui network:',
              choices: ['mainnet', 'testnet'],
              default: 'testnet',
            },
            {
              type: 'input',
              name: 'rpcUrl',
              message: 'Sui RPC URL (optional, uses default):',
            },
            {
              type: 'input',
              name: 'packageId',
              message: 'Walrus blob registry package ID:',
              validate: (input) => input.startsWith('0x') || 'Please enter a valid package ID',
            },
            {
              type: 'password',
              name: 'privateKey',
              message: 'Private key (optional, for writing operations):',
              mask: '*',
            },
          ]);

          blockchainConfig.sui = {
            network: suiConfig.network,
            packageId: suiConfig.packageId,
            ...(suiConfig.rpcUrl && { rpcUrl: suiConfig.rpcUrl }),
            ...(suiConfig.privateKey && { privateKey: suiConfig.privateKey }),
          };
        }
      }

      // Default settings
      const defaults = await inquirer.prompt([
        {
          type: 'list',
          name: 'chain',
          message: 'Default blockchain for operations:',
          choices: ['ethereum', 'sui', 'solana'],
          default: 'ethereum',
          when: () => Object.keys(blockchainConfig).length > 0,
        },
        {
          type: 'confirm',
          name: 'registerOnChain',
          message: 'Register uploads on blockchain by default?',
          default: false,
          when: () => Object.keys(blockchainConfig).length > 0,
        },
        {
          type: 'number',
          name: 'concurrency',
          message: 'Default upload concurrency:',
          default: 3,
          validate: (input) => input > 0 && input <= 10 || 'Concurrency must be between 1 and 10',
        },
      ]);

      // Build final configuration
      const config = {
        baseUrl: basicConfig.baseUrl,
        ...(basicConfig.apiKey && { apiKey: basicConfig.apiKey }),
        timeout: basicConfig.timeout * 1000, // Convert to milliseconds
        ...(Object.keys(blockchainConfig).length > 0 && { blockchain: blockchainConfig }),
        defaults: {
          concurrency: defaults.concurrency,
          ...(defaults.chain && { chain: defaults.chain }),
          ...(defaults.registerOnChain !== undefined && { registerOnChain: defaults.registerOnChain }),
        },
      };

      // Save configuration
      await saveConfig(config, options.config);

      // Success message
      console.log(chalk.green('\n✅ Configuration saved successfully!'));
      console.log(`Config file: ${chalk.cyan(configPath)}`);
      
      // Show next steps
      console.log(chalk.bold('\n📋 Next Steps:'));
      console.log('1. Test your configuration:');
      console.log(chalk.gray('   wcdn status'));
      console.log('2. Upload your first file:');
      console.log(chalk.gray('   wcdn upload myfile.txt'));
      
      if (Object.keys(blockchainConfig).length > 0) {
        console.log('3. Check blockchain integration:');
        console.log(chalk.gray('   wcdn blockchain status'));
      }

      // Show warnings if needed
      if (basicConfig.apiKey && basicConfig.apiKey.includes('YOUR_API_KEY')) {
        console.log(chalk.yellow('\n⚠️  Warning: Remember to replace placeholder API keys with real values'));
      }

      if (blockchainConfig.ethereum?.privateKey || blockchainConfig.sui?.privateKey) {
        console.log(chalk.yellow('\n🔒 Security Note: Private keys are stored in plain text. Consider using environment variables in production.'));
      }

    } catch (error) {
      log(`Configuration error: ${error.message}`, 'error');
      process.exit(1);
    }
  });