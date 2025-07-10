import { useState, memo } from 'react'
import { useVaults, useFiles, useCreateVault } from '../hooks/api/useVaults'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Plus, Database } from 'lucide-react'
import { truncateText } from '../lib/utils'

interface VaultSelectorProps {
  selectedVault: string
  onVaultChange: (vaultId: string) => void
}

export const VaultSelector = memo(function VaultSelector({
  selectedVault,
  onVaultChange,
}: VaultSelectorProps) {
  const [newVaultName, setNewVaultName] = useState('')
  const [showCreateVault, setShowCreateVault] = useState(false)

  const { data: vaults = [], isLoading } = useVaults()
  const { data: files = [] } = useFiles()
  const createVaultMutation = useCreateVault()

  const handleCreateVault = async () => {
    if (!newVaultName.trim()) return

    try {
      await createVaultMutation.mutateAsync({
        name: newVaultName.trim(),
      })
      setNewVaultName('')
      setShowCreateVault(false)
    } catch (error) {
      console.error('Failed to create vault:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Vault</CardTitle>
        <CardDescription>
          Choose a vault to upload files to, or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full">
          <div className="flex-1 min-w-0">
            <Select
              value={selectedVault}
              onValueChange={onVaultChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    isLoading ? 'Loading vaults...' : 'Select a vault...'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {vaults.length === 0 && !isLoading ? (
                  <SelectItem value="no-vaults" disabled>
                    No vaults available - create one first
                  </SelectItem>
                ) : (
                  vaults.map((vault) => {
                    // Calculate current file count for this vault
                    const currentFileCount = files.filter(
                      (f) => f.vaultId === vault.id,
                    ).length
                    return (
                      <SelectItem key={vault.id} value={vault.id}>
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4 text-gray-400" />
                          <span>
                            {truncateText(vault.name, 30)} ({currentFileCount}{' '}
                            files)
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowCreateVault(!showCreateVault)}
            className="w-full sm:w-auto shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Vault
          </Button>
        </div>

        {showCreateVault && (
          <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full">
            <div className="flex-1 min-w-0">
              <Input
                placeholder="Vault name"
                value={newVaultName}
                onChange={(e) => setNewVaultName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateVault()}
                className="w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 shrink-0">
              <Button
                onClick={handleCreateVault}
                disabled={!newVaultName.trim()}
                className="w-full sm:w-auto"
              >
                Create
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateVault(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
