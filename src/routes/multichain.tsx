import { createFileRoute } from '@tanstack/react-router'
import { MultiChainNFTDemo } from '../components/MultiChainNFTDemo'

export const Route = createFileRoute('/multichain')({
  component: () => (
    <div className="container mx-auto p-4">
      <MultiChainNFTDemo />
    </div>
  ),
})