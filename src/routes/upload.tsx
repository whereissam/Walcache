import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { LazyRoute } from '../components/LazyRoute'

// Lazy load the UploadManager component
const UploadManager = lazy(() =>
  import('../components/UploadManager').then((module) => ({
    default: module.UploadManager,
  })),
)

export const Route = createFileRoute('/upload')({
  component: () => (
    <LazyRoute>
      <UploadManager />
    </LazyRoute>
  ),
})
