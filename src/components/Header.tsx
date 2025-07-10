import { useState, useEffect } from 'react'
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
  User,
  LogOut,
  Key,
  CreditCard,
  ChevronDown,
  LogIn,
  UserPlus,
} from 'lucide-react'
import { ThemeToggle } from './ui/theme-toggle'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { useAuthStore } from '../store/authStore'
import walcacheLogo from '../assets/walcache-logo.jpeg'

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen)
  }

  const handleLogout = () => {
    logout()
    setIsUserMenuOpen(false)
  }

  const getSubscriptionColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
      case 'starter':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'professional':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
      case 'enterprise':
        return 'bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-100'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
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
              <span>Analytics</span>
            </Link>

            <Link
              to="/explorer"
              className="flex items-center space-x-1 text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
              activeProps={{ className: 'text-primary bg-accent' }}
            >
              <Search className="h-4 w-4" />
              <span>Explorer</span>
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-1 text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                  activeProps={{ className: 'text-primary bg-accent' }}
                >
                  <User className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/tokens"
                  className="flex items-center space-x-1 text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                  activeProps={{ className: 'text-primary bg-accent' }}
                >
                  <Key className="h-4 w-4" />
                  <span>Tokens</span>
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
              </>
            )}

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

            {/* Authentication */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center space-x-4">
                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={toggleUserMenu}
                    className="flex items-center space-x-2 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <User className="h-4 w-4" />
                    <span>{user?.username}</span>
                    <Badge
                      className={getSubscriptionColor(
                        user?.subscriptionTier || 'free',
                      )}
                    >
                      {user?.subscriptionTier}
                    </Badge>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-background rounded-md shadow-lg border border-border z-50">
                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          className="flex items-center px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Dashboard
                        </Link>
                        <Link
                          to="/tokens"
                          className="flex items-center px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          API Tokens
                        </Link>
                        <div className="border-t border-border"></div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

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
                <span>Analytics</span>
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

              {isAuthenticated && (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-accent px-3 py-2 rounded-md text-base font-medium"
                    activeProps={{ className: 'text-primary bg-accent' }}
                    onClick={closeMobileMenu}
                  >
                    <User className="h-5 w-5" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    to="/tokens"
                    className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-accent px-3 py-2 rounded-md text-base font-medium"
                    activeProps={{ className: 'text-primary bg-accent' }}
                    onClick={closeMobileMenu}
                  >
                    <Key className="h-5 w-5" />
                    <span>API Tokens</span>
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
                </>
              )}

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

              {/* Mobile Authentication */}
              {isAuthenticated ? (
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {user?.username}
                      </span>
                    </div>
                    <Badge
                      className={getSubscriptionColor(
                        user?.subscriptionTier || 'free',
                      )}
                    >
                      {user?.subscriptionTier}
                    </Badge>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout()
                      closeMobileMenu()
                    }}
                    className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-accent px-3 py-2 rounded-md text-base font-medium w-full"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="border-t border-border pt-3 mt-3 space-y-2">
                  <Link
                    to="/login"
                    className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-accent px-3 py-2 rounded-md text-base font-medium"
                    onClick={closeMobileMenu}
                  >
                    <LogIn className="h-5 w-5" />
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center space-x-3 text-muted-foreground hover:text-primary hover:bg-accent px-3 py-2 rounded-md text-base font-medium"
                    onClick={closeMobileMenu}
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Sign Up</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
