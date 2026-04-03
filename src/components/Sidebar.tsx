import { useEffect, useState } from 'react'
import { Link, useMatches } from '@tanstack/react-router'
import {
  BarChart3,
  Code,
  Database,
  Key,
  LogIn,
  LogOut,
  Menu,
  Search,
  Shield,
  Upload,
  X,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { ThemeToggle } from './ui/theme-toggle'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  requiresAuth?: boolean
}

const mainNav: NavItem[] = [
  { to: '/', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
  { to: '/explorer', label: 'Explorer', icon: <Search className="h-4 w-4" /> },
  {
    to: '/upload',
    label: 'Upload',
    icon: <Upload className="h-4 w-4" />,
    requiresAuth: true,
  },
  {
    to: '/cache',
    label: 'Cache',
    icon: <Database className="h-4 w-4" />,
    requiresAuth: true,
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: <BarChart3 className="h-4 w-4" />,
    requiresAuth: true,
  },
  {
    to: '/tokens',
    label: 'API Tokens',
    icon: <Key className="h-4 w-4" />,
    requiresAuth: true,
  },
]

const secondaryNav: NavItem[] = [
  {
    to: '/api-showcase',
    label: 'API Playground',
    icon: <Code className="h-4 w-4" />,
  },
  { to: '/seal', label: 'Seal', icon: <Shield className="h-4 w-4" /> },
  { to: '/api', label: 'Docs', icon: <Code className="h-4 w-4" /> },
]

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore()
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.pathname ?? '/'

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const isActive = (to: string) => {
    if (to === '/') return currentPath === '/'
    return currentPath.startsWith(to)
  }

  const renderNav = (items: NavItem[], label?: string) => (
    <div className="space-y-0.5">
      {label && (
        <div className="px-3 pt-4 pb-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            {label}
          </span>
        </div>
      )}
      {items
        .filter((item) => !item.requiresAuth || isAuthenticated)
        .map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setIsMobileOpen(false)}
            className={`
              group flex items-center gap-2.5 px-3 py-1.5 mx-2 rounded-md text-[13px] font-medium
              transition-colors duration-100
              ${
                isActive(item.to)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }
            `}
          >
            <span
              className={
                isActive(item.to)
                  ? 'text-primary'
                  : 'text-muted-foreground group-hover:text-foreground'
              }
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
    </div>
  )

  const navAndFooter = (
    <>
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {renderNav(mainNav)}
        {renderNav(secondaryNav, 'Resources')}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <ThemeToggle />
        </div>
        {isAuthenticated ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-primary">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">
                  {user?.username}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.subscriptionTier}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                logout()
                setIsMobileOpen(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 mx-0 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign in
          </Link>
        )}
      </div>
    </>
  )

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo — desktop only */}
      <div className="px-4 h-14 flex items-center border-b border-sidebar-border">
        <Link
          to="/"
          className="flex items-center gap-2.5"
          onClick={() => setIsMobileOpen(false)}
        >
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm font-display">
              W
            </span>
          </div>
          <span className="text-[15px] font-semibold text-foreground font-display tracking-tight">
            Walcache
          </span>
        </Link>
      </div>
      {navAndFooter}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col h-screen sticky top-0 w-[240px] border-r border-sidebar-border bg-sidebar">
        {sidebarContent}
      </aside>

      {/* Mobile header + drawer */}
      <div className="md:hidden sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs font-display">
                W
              </span>
            </div>
            <span className="text-sm font-semibold font-display">Walcache</span>
          </Link>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="md:hidden fixed top-12 left-0 bottom-0 w-[280px] z-50 bg-sidebar border-r border-sidebar-border overflow-y-auto flex flex-col">
            {navAndFooter}
          </div>
        </>
      )}
    </>
  )
}
