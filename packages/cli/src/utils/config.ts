import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { WalrusCDNClient } from '@wcdn/sdk';
import { PRESET_CONFIGS } from '@wcdn/sdk/blockchain';

interface WCDNConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  blockchain?: {
    ethereum?: {
      rpcUrl: string;
      contractAddress: string;
      privateKey?: string;
      network: 'mainnet' | 'sepolia';
    };
    sui?: {
      rpcUrl: string;
      packageId: string;
      privateKey?: string;
      network: 'mainnet' | 'testnet';
    };
    solana?: {
      rpcUrl: string;
      programId: string;
      privateKey?: string;
      network: 'mainnet' | 'testnet' | 'devnet';
    };
  };
  defaults?: {
    chain: 'ethereum' | 'sui' | 'solana';
    registerOnChain: boolean;
    concurrency: number;
  };
}

let globalConfig: WCDNConfig | null = null;
let globalClient: WalrusCDNClient | null = null;

export async function loadConfig(configPath: string = '.wcdn.json'): Promise<WCDNConfig> {
  const fullPath = path.resolve(configPath);
  
  if (!await fs.pathExists(fullPath)) {
    throw new Error(`Config file not found: ${fullPath}`);
  }

  try {
    const configData = await fs.readJson(fullPath);
    
    // Validate required fields
    if (!configData.baseUrl) {
      throw new Error('baseUrl is required in config');
    }

    globalConfig = configData;
    return configData;
  } catch (error) {
    throw new Error(`Failed to load config: ${error.message}`);
  }
}

export async function saveConfig(config: WCDNConfig, configPath: string = '.wcdn.json'): Promise<void> {
  const fullPath = path.resolve(configPath);
  
  try {
    await fs.writeJson(fullPath, config, { spaces: 2 });
    globalConfig = config;
  } catch (error) {
    throw new Error(`Failed to save config: ${error.message}`);
  }
}

export function getConfig(): WCDNConfig {
  if (!globalConfig) {
    throw new Error('Configuration not loaded. Run "wcdn init" first.');
  }
  return globalConfig;
}

export function getWCDNClient(): WalrusCDNClient {
  if (!globalClient) {
    const config = getConfig();
    
    // Prepare blockchain config
    let blockchainConfig: any = {};
    
    if (config.blockchain?.ethereum) {
      const eth = config.blockchain.ethereum;
      if (eth.network === 'mainnet') {
        blockchainConfig.ethereum = PRESET_CONFIGS.ethereum.mainnet(
          eth.contractAddress,
          eth.privateKey
        );
        blockchainConfig.ethereum.rpcUrl = eth.rpcUrl;
      } else {
        blockchainConfig.ethereum = PRESET_CONFIGS.ethereum.sepolia(
          eth.contractAddress,
          eth.privateKey
        );
        blockchainConfig.ethereum.rpcUrl = eth.rpcUrl;
      }
    }

    if (config.blockchain?.sui) {
      const sui = config.blockchain.sui;
      if (sui.network === 'mainnet') {
        blockchainConfig.sui = PRESET_CONFIGS.sui.mainnet(
          sui.packageId,
          sui.privateKey
        );
      } else {
        blockchainConfig.sui = PRESET_CONFIGS.sui.testnet(
          sui.packageId,
          sui.privateKey
        );
      }
      if (sui.rpcUrl) {
        blockchainConfig.sui.rpcUrl = sui.rpcUrl;
      }
    }

    globalClient = new WalrusCDNClient(
      {
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        timeout: config.timeout || 30000,
      },
      Object.keys(blockchainConfig).length > 0 ? blockchainConfig : undefined
    );
  }

  return globalClient;
}

export function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const prefix = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✓'),
    warning: chalk.yellow('⚠'),
    error: chalk.red('✗'),
  };

  console.log(`${prefix[type]} ${message}`);
}

export function verbose(message: string) {
  if (process.env.WCDN_VERBOSE) {
    console.log(chalk.gray(`[DEBUG] ${message}`));
  }
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function createProgressBar(total: number): (current: number) => void {
  const width = 30;
  let lastUpdate = 0;

  return (current: number) => {
    const now = Date.now();
    if (now - lastUpdate < 100 && current < total) return; // Throttle updates
    lastUpdate = now;

    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    
    process.stdout.write(`\r${chalk.blue('Progress:')} [${bar}] ${percentage}% (${current}/${total})`);
    
    if (current >= total) {
      process.stdout.write('\n');
    }
  };
}