import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { LazyRoute } from '../components/LazyRoute'
import { ValueProposition } from '../components/ValueProposition'

const Dashboard = lazy(() =>
  import('../components/Dashboard').then((module) => ({
    default: module.Dashboard,
  })),
)

export const Route = createFileRoute('/')({
  component: () => (
    <LazyRoute>
      <div className="space-y-16">
        <ValueProposition />
        <div className="border-t border-border pt-8">
          <Dashboard />
        </div>
      </div>
    </LazyRoute>
  ),
})
