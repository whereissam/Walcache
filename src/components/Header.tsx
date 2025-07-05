import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Database,
  Search,
  Settings,
  BarChart3,
  Upload,
  Menu,
  X,
  Code,
  Globe,
  PlayCircle,
} from 'lucide-react'

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center space-x-2"
              onClick={closeMobileMenu}
            >
              <Database className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">WCDN</span>
            </Link>
            <span className="ml-2 text-sm text-gray-500 hidden sm:inline">
              Walrus CDN Layer
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-blue-600 bg-blue-50' }}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/explorer"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-blue-600 bg-blue-50' }}
            >
              <Search className="h-4 w-4" />
              <span>Explorer</span>
            </Link>

            <Link
              to="/cache"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-blue-600 bg-blue-50' }}
            >
              <Settings className="h-4 w-4" />
              <span>Cache</span>
            </Link>

            <Link
              to="/upload"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-blue-600 bg-blue-50' }}
            >
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </Link>

            <Link
              to="/demo"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-blue-600 bg-blue-50' }}
            >
              <PlayCircle className="h-4 w-4" />
              <span>Demo</span>
            </Link>

            <Link
              to="/multichain"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-blue-600 bg-blue-50' }}
            >
              <Globe className="h-4 w-4" />
              <span>Multi-Chain</span>
            </Link>

            <Link
              to="/api"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-blue-600 bg-blue-50' }}
            >
              <Code className="h-4 w-4" />
              <span>API</span>
            </Link>
          </nav>

          {/* Desktop Status & Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            {/* Status Indicator */}
            <div className="hidden sm:flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Online</span>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={toggleMobileMenu}
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              <Link
                to="/"
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-blue-600 bg-blue-50' }}
                onClick={closeMobileMenu}
              >
                <BarChart3 className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/explorer"
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-blue-600 bg-blue-50' }}
                onClick={closeMobileMenu}
              >
                <Search className="h-5 w-5" />
                <span>CID Explorer</span>
              </Link>

              <Link
                to="/cache"
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-blue-600 bg-blue-50' }}
                onClick={closeMobileMenu}
              >
                <Settings className="h-5 w-5" />
                <span>Cache Manager</span>
              </Link>

              <Link
                to="/upload"
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-blue-600 bg-blue-50' }}
                onClick={closeMobileMenu}
              >
                <Upload className="h-5 w-5" />
                <span>Upload Files</span>
              </Link>

              <Link
                to="/demo"
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-blue-600 bg-blue-50' }}
                onClick={closeMobileMenu}
              >
                <PlayCircle className="h-5 w-5" />
                <span>Upload Demo</span>
              </Link>

              <Link
                to="/multichain"
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-blue-600 bg-blue-50' }}
                onClick={closeMobileMenu}
              >
                <Globe className="h-5 w-5" />
                <span>Multi-Chain Demo</span>
              </Link>

              <Link
                to="/api"
                className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-blue-600 bg-blue-50' }}
                onClick={closeMobileMenu}
              >
                <Code className="h-5 w-5" />
                <span>API Guide</span>
              </Link>

              {/* Mobile Status */}
              <div className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Online</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
