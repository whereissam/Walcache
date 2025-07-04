import { createFileRoute } from '@tanstack/react-router'
import { CIDExplorer } from '../components/CIDExplorer'

export const Route = createFileRoute('/explorer')({
  component: CIDExplorer,
})