import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
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
import { ThemeToggle } from './ui/theme-toggle'
import walcacheLogo from '../assets/walcache-logo.jpeg'

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="bg-background shadow-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center space-x-2"
              onClick={closeMobileMenu}
            >
              <img
                src={walcacheLogo}
                alt="Walcache Logo"
                className="h-8 w-8 rounded-lg"
              />
              <span className="text-xl font-bold text-foreground">
                Walcache
              </span>
            </Link>
            <span className="ml-2 text-sm text-muted-foreground hidden sm:inline">
              Walrus CDN
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/"
              className="flex items-center space-x-1 text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-primary bg-accent' }}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/explorer"
              className="flex items-center space-x-1 text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-primary bg-accent' }}
            >
              <Search className="h-4 w-4" />
              <span>Explorer</span>
            </Link>

            <Link
              to="/cache"
              className="flex items-center space-x-1 text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-primary bg-accent' }}
            >
              <Settings className="h-4 w-4" />
              <span>Cache</span>
            </Link>

            <Link
              to="/upload"
              className="flex items-center space-x-1 text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-primary bg-accent' }}
            >
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </Link>

            <Link
              to="/demo"
              className="flex items-center space-x-1 text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-primary bg-accent' }}
            >
              <PlayCircle className="h-4 w-4" />
              <span>Demo</span>
            </Link>

            <Link
              to="/multichain"
              className="flex items-center space-x-1 text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-primary bg-accent' }}
            >
              <Globe className="h-4 w-4" />
              <span>Multi-Chain</span>
            </Link>

            <Link
              to="/api"
              className="flex items-center space-x-1 text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-primary bg-accent' }}
            >
              <Code className="h-4 w-4" />
              <span>API</span>
            </Link>
          </nav>

          {/* Desktop Status & Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Status Indicator */}
            <div className="hidden sm:flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Online</span>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
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
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-border">
              <Link
                to="/"
                className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-accent px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-primary bg-accent' }}
                onClick={closeMobileMenu}
              >
                <BarChart3 className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/explorer"
                className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-accent px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-primary bg-accent' }}
                onClick={closeMobileMenu}
              >
                <Search className="h-5 w-5" />
                <span>CID Explorer</span>
              </Link>

              <Link
                to="/cache"
                className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-accent px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-primary bg-accent' }}
                onClick={closeMobileMenu}
              >
                <Settings className="h-5 w-5" />
                <span>Cache Manager</span>
              </Link>

              <Link
                to="/upload"
                className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-accent px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-primary bg-accent' }}
                onClick={closeMobileMenu}
              >
                <Upload className="h-5 w-5" />
                <span>Upload Files</span>
              </Link>

              <Link
                to="/demo"
                className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-accent px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-primary bg-accent' }}
                onClick={closeMobileMenu}
              >
                <PlayCircle className="h-5 w-5" />
                <span>Upload Demo</span>
              </Link>

              <Link
                to="/multichain"
                className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-accent px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-primary bg-accent' }}
                onClick={closeMobileMenu}
              >
                <Globe className="h-5 w-5" />
                <span>Multi-Chain Demo</span>
              </Link>

              <Link
                to="/api"
                className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-accent px-3 py-2 rounded-md text-base font-medium"
                activeProps={{ className: 'text-primary bg-accent' }}
                onClick={closeMobileMenu}
              >
                <Code className="h-5 w-5" />
                <span>API Guide</span>
              </Link>

              {/* Mobile Status */}
              <div className="flex items-center space-x-3 px-3 py-2 text-sm text-muted-foreground">
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
