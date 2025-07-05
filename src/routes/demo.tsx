import { createFileRoute } from '@tanstack/react-router'
import { UploadCacheDemo } from '../components/UploadCacheDemo'

export const Route = createFileRoute('/demo')({
  component: () => (
    <div className="container mx-auto p-4">
      <UploadCacheDemo />
    </div>
  ),
})