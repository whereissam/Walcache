import React from 'react'
import { useWalcache, SupportedChain } from '../contexts/WalcacheContext'

const chains: { value: SupportedChain; label: string; emoji: string }[] = [
  { value: 'sui', label: 'Sui', emoji: '🌊' },
  { value: 'ethereum', label: 'Ethereum', emoji: '⟠' },
  { value: 'solana', label: 'Solana', emoji: '☀️' },
]

interface ChainSelectorProps {
  className?: string
}

export default function ChainSelector({ className = '' }: ChainSelectorProps) {
  const { selectedChain, setSelectedChain } = useWalcache()

  return (
    <div className={`chain-selector flex gap-2 ${className}`}>
      {chains.map((chain) => (
        <button
          key={chain.value}
          onClick={() => setSelectedChain(chain.value)}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all duration-300 border-2
            ${
              selectedChain === chain.value
                ? 'border-primary-500 bg-primary-500 text-white shadow-lg active'
                : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
            }
          `}
        >
          <span className="mr-2">{chain.emoji}</span>
          {chain.label}
        </button>
      ))}
    </div>
  )
}