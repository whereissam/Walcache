import { createFileRoute } from '@tanstack/react-router'
import { ApiShowcase } from '../components/ApiShowcase'

export const Route = createFileRoute('/api-showcase')({
  component: ApiShowcase,
})