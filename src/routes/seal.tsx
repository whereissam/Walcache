import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { LazyRoute } from '../components/LazyRoute'

// Lazy load the SealUpload component
const SealUpload = lazy(() =>
  import('../components/SealUpload').then((module) => ({
    default: module.SealUpload,
  })),
)

export const Route = createFileRoute('/seal')({
  component: () => (
    <LazyRoute>
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Seal Encrypted Storage</h1>
            <p className="text-muted-foreground">
              Upload files with blockchain-based access control powered by Mysten's Seal technology.
              Your files are encrypted before storage and can only be decrypted by authorized users.
            </p>
          </div>
          <SealUpload />
        </div>
      </div>
    </LazyRoute>
  ),
})