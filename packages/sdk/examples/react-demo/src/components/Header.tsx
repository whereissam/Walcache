import React from 'react'
import { Rocket, Database, Shield } from 'lucide-react'

export default function Header() {
  return (
    <header className="text-center text-white mb-10">
      <div className="flex justify-center items-center gap-3 mb-4">
        <Rocket className="w-12 h-12" />
        <h1 className="text-5xl font-bold">Walcache SDK</h1>
      </div>
      
      <p className="text-xl opacity-90 mb-4">
        Universal Multi-Chain Storage for Web3 Applications
      </p>
      
      <div className="flex justify-center gap-8 text-sm opacity-80">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span>One API, All Blockchains</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Backend SDK Integration</span>
        </div>
      </div>
      
      <div className="mt-6 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 max-w-2xl mx-auto">
        <p className="text-sm">
          <strong>💡 Architecture:</strong> Your React app calls your backend API → 
          Your backend uses Walcache SDK → SDK handles all blockchain complexity
        </p>
      </div>
    </header>
  )
}