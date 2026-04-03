import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Sidebar from '../components/Sidebar'
import { AsyncErrorBoundary, ErrorBoundary } from '../components/ErrorBoundary'

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <AsyncErrorBoundary>
        <div className="app-layout">
          <ErrorBoundary
            fallback={
              <div className="p-4 text-destructive text-sm">Navigation failed to load</div>
            }
          >
            <Sidebar />
          </ErrorBoundary>
          <main className="min-h-screen overflow-x-hidden">
            <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-6 sm:py-8 page-enter">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
          <TanStackRouterDevtools />
        </div>
      </AsyncErrorBoundary>
    </ErrorBoundary>
  ),
})
