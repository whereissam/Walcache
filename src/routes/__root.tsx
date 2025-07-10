import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Header from '../components/Header'
import { ErrorBoundary, AsyncErrorBoundary } from '../components/ErrorBoundary'

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <AsyncErrorBoundary>
        <div className="min-h-screen bg-background">
          <ErrorBoundary
            fallback={
              <div className="p-4 text-red-600">Header failed to load</div>
            }
          >
            <Header />
          </ErrorBoundary>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
          <TanStackRouterDevtools />
        </div>
      </AsyncErrorBoundary>
    </ErrorBoundary>
  ),
})
