import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { LazyRoute } from '../components/LazyRoute'

// Lazy load the tokens page
const TokensPageContent = lazy(() =>
  import('../components/TokensPage').then((module) => ({
    default: module.TokensPage,
  })),
)

export const Route = createFileRoute('/tokens')({
  component: () => (
    <LazyRoute>
      <TokensPageContent />
    </LazyRoute>
  ),
})
