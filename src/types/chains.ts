// 統一的鏈類型定義
export type SupportedChain = 'sui' | 'ethereum' | 'solana'

export interface ChainInfo {
  name: string
  displayName: string
  color: string
  bgColor: string
  status: 'active' | 'mock'
  icon: string
  description: string
  aggregator: string
}

export const CHAIN_CONFIG: Record<SupportedChain, ChainInfo> = {
  sui: {
    name: 'sui',
    displayName: 'Sui',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    status: 'active',
    icon: '🌊',
    description: 'Real Walrus Network (Testnet)',
    aggregator: 'https://aggregator.walrus-testnet.walrus.space',
  },
  ethereum: {
    name: 'ethereum',
    displayName: 'Ethereum',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    status: 'mock',
    icon: '⟠',
    description: 'Hackathon Mock (Future Integration)',
    aggregator: 'https://eth-aggregator.walrus.space',
  },
  solana: {
    name: 'solana',
    displayName: 'Solana',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    status: 'mock',
    icon: '◎',
    description: 'Hackathon Mock (Future Integration)',
    aggregator: 'https://sol-aggregator.walrus.space',
  },
}
