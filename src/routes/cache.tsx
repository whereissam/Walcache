import { createFileRoute } from '@tanstack/react-router'
import { CacheManager } from '../components/CacheManager'

export const Route = createFileRoute('/cache')({
  component: CacheManager,
})
