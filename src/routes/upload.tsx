import { createFileRoute } from '@tanstack/react-router'
import { UploadManager } from '../components/UploadManager'

export const Route = createFileRoute('/upload')({
  component: UploadManager,
})
