import { createFileRoute } from '@tanstack/react-router'
import { APIGuide } from '../components/APIGuide'

export const Route = createFileRoute('/api')({
  component: APIGuide,
})
