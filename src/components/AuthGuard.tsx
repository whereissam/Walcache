import React, { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../store/authStore'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredPermissions?: string[]
  fallbackPath?: string
}

export function AuthGuard({
  children,
  requireAuth = true,
  requiredPermissions = [],
  fallbackPath = '/login',
}: AuthGuardProps) {
  const navigate = useNavigate()
  const { isAuthenticated, user, loading, checkAuth } = useAuthStore()

  useEffect(() => {
    // Check authentication status on mount
    if (requireAuth && !isAuthenticated && !loading) {
      checkAuth()
    }
  }, [requireAuth, isAuthenticated, loading, checkAuth])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    navigate({ to: fallbackPath })
    return null
  }

  // Check if user has required permissions
  if (requireAuth && requiredPermissions.length > 0 && user) {
    const hasRequiredPermissions = requiredPermissions.some(
      (permission) =>
        user.permissions?.includes(permission) ||
        user.permissions?.includes('ADMIN'),
    )

    if (!hasRequiredPermissions) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => navigate({ to: '/' })}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      )
    }
  }

  // Render children if authentication and permissions are satisfied
  return <>{children}</>
}

// HOC for protecting routes
export function withAuthGuard<T extends object>(
  Component: React.ComponentType<T>,
  options: Omit<AuthGuardProps, 'children'> = {},
) {
  return function ProtectedComponent(props: T) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}
