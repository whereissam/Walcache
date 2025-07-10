import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

interface LazyRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

// Loading component for route transitions
const DefaultRouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
      <p className="text-gray-600 dark:text-gray-300">Loading...</p>
    </div>
  </div>
)

// Skeleton loading component for better UX
const SkeletonLoader = () => (
  <div className="animate-pulse">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg border p-6"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
)

export const LazyRoute: React.FC<LazyRouteProps> = ({
  children,
  fallback = <SkeletonLoader />,
}) => {
  return <Suspense fallback={fallback}>{children}</Suspense>
}

// HOC for wrapping lazy components
export const withLazyLoading = <T extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<T>>,
  fallback?: React.ReactNode,
) => {
  return (props: T) => (
    <LazyRoute fallback={fallback}>
      <LazyComponent {...props} />
    </LazyRoute>
  )
}
