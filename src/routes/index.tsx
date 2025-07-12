import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { LazyRoute } from '../components/LazyRoute'
import { ValueProposition } from '../components/ValueProposition'

// Lazy load the Dashboard component
const Dashboard = lazy(() =>
  import('../components/Dashboard').then((module) => ({
    default: module.Dashboard,
  })),
)

export const Route = createFileRoute('/')({
  component: () => (
    <LazyRoute>
      <div className="space-y-12">
        <ValueProposition />
        <Dashboard />
      </div>
    </LazyRoute>
  ),
})
