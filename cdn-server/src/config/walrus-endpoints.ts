/**
 * Official Walrus Aggregator and Publisher endpoints
 * Source: https://docs.walrus.site/usage/public-services.html
 */

export const WALRUS_ENDPOINTS = {
  testnet: {
    aggregators: [
      'https://aggregator.walrus-testnet.walrus.space',
      'https://aggregator.testnet.walrus.atalma.io',
      'https://sui-walrus-tn-aggregator.bwarelabs.com',
      'https://walrus-testnet-aggregator.chainbase.online',
      'https://walrus-testnet-aggregator.everstake.one',
      'https://wal-aggregator-testnet.staketab.org',
      'https://walrus-testnet-aggregator.nodes.guru',
      'https://walrus-testnet-aggregator.stakely.io',
      'https://aggregator.testnet.walrus.mirai.cloud',
      'https://sm1-walrus-testnet-aggregator.stakesquid.com'
    ],
    publishers: [
      'https://publisher.walrus-testnet.walrus.space',
      'https://publisher.testnet.walrus.atalma.io',
      'https://sui-walrus-testnet-publisher.bwarelabs.com',
      'https://walrus-testnet-publisher.chainbase.online',
      'https://walrus-testnet-publisher.everstake.one',
      'https://wal-publisher-testnet.staketab.org',
      'https://walrus-testnet-publisher.nodes.guru',
      'https://walrus-testnet-publisher.stakely.io',
      'https://sm1-walrus-testnet-publisher.stakesquid.com'
    ]
  },
  mainnet: {
    aggregators: [
      'https://aggregator.walrus-mainnet.walrus.space',
      'https://aggregator.walrus.atalma.io',
      'https://sui-walrus-mainnet-aggregator.bwarelabs.com',
      'https://walrus-aggregator.chainbase.online',
      'https://walrus-mainnet-aggregator.everstake.one',
      'https://wal-aggregator-mainnet.staketab.org',
      'https://walrus-aggregator.stakely.io',
      'https://aggregator.mainnet.walrus.mirai.cloud',
      'https://sm1-walrus-mainnet-aggregator.stakesquid.com',
      'https://walrus.globalstake.io'
    ],
    publishers: [
      'https://publisher.walrus-mainnet.walrus.space',
      'https://publisher.walrus.atalma.io',
      'https://walrus-mainnet-publisher.chainbase.online',
      'https://walrus-mainnet-publisher.everstake.one',
      'https://walrus-publisher.stakely.io',
      'https://walrus-mainnet-publisher.nodes.guru'
    ]
  }
} as const;

export type WalrusNetwork = keyof typeof WALRUS_ENDPOINTS;