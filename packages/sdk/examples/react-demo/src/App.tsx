import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { WalcacheProvider } from './contexts/WalcacheContext'
import Header from './components/Header'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import UploadAsset from './pages/UploadAsset'
import AssetInfo from './pages/AssetInfo'
import MultiChainUrls from './pages/MultiChainUrls'
import AssetVerification from './pages/AssetVerification'
import ServiceMetrics from './pages/ServiceMetrics'
import UseCaseDemo from './pages/UseCaseDemo'
import DeveloperIntegration from './pages/DeveloperIntegration'
import './App.css'

function App() {
  return (
    <WalcacheProvider>
      <div className="min-h-screen gradient-bg">
        <div className="container mx-auto px-4 py-6">
          <Header />
          <Navigation />
          
          <main className="mt-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<UploadAsset />} />
              <Route path="/asset-info" element={<AssetInfo />} />
              <Route path="/urls" element={<MultiChainUrls />} />
              <Route path="/verify" element={<AssetVerification />} />
              <Route path="/metrics" element={<ServiceMetrics />} />
              <Route path="/use-cases" element={<UseCaseDemo />} />
              <Route path="/integration" element={<DeveloperIntegration />} />
            </Routes>
          </main>
        </div>
      </div>
    </WalcacheProvider>
  )
}

export default App