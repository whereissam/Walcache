import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthStore, type ApiToken } from '../store/authStore'
import { AuthGuard } from './AuthGuard'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  AlertCircle,
  Activity,
  Database,
  Calendar,
  Shield,
  Settings,
  Loader2,
} from 'lucide-react'

interface CreateTokenForm {
  name: string
  description: string
  permissions: string[]
  expiresAt: string
}

export const TokensPage = () => {
  return (
    <AuthGuard>
      <TokensContent />
    </AuthGuard>
  )
}

function TokensContent() {
  const { user, tokens, createToken, loadTokens, revokeToken, loading, error } =
    useAuthStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [newToken, setNewToken] = useState<ApiToken | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateTokenForm>({
    defaultValues: {
      permissions: ['READ_CDN'],
    },
  })

  const watchedPermissions = watch('permissions')

  useEffect(() => {
    loadTokens()
  }, [loadTokens])

  const onSubmit = async (data: CreateTokenForm) => {
    try {
      const token = await createToken({
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        expiresAt: data.expiresAt || undefined,
      })

      setNewToken(token)
      setShowTokenModal(token.id)
      setShowCreateForm(false)
      reset()
    } catch (error) {
      // Error handled by store
    }
  }

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleRevokeToken = async (tokenId: string) => {
    if (
      confirm(
        'Are you sure you want to revoke this token? This action cannot be undone.',
      )
    ) {
      try {
        await revokeToken(tokenId)
      } catch (error) {
        // Error handled by store
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'READ_CDN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'WRITE_CDN':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      case 'UPLOAD_FILES':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
      case 'MANAGE_CACHE':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
      case 'VIEW_ANALYTICS':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100'
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              API Tokens
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage your API tokens and permissions
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Token
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* New Token Modal */}
        {showTokenModal && newToken && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  Token Created Successfully
                </CardTitle>
                <CardDescription>
                  Save this token securely. It will not be shown again.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Token Name</Label>
                  <p className="font-medium">{newToken.name}</p>
                </div>
                <div>
                  <Label>API Token</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      value={newToken.token}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyToken(newToken.token)}
                    >
                      {copiedToken === newToken.token ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTokenModal(null)
                      setNewToken(null)
                    }}
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Token Form */}
        {showCreateForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New API Token</CardTitle>
              <CardDescription>
                Generate a new token with specific permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Token Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Production API Key"
                      {...register('name', {
                        required: 'Token name is required',
                      })}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      {...register('expiresAt')}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional description"
                    {...register('description')}
                  />
                </div>

                <div>
                  <Label>Permissions *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {[
                      { value: 'READ_CDN', label: 'Read CDN' },
                      { value: 'WRITE_CDN', label: 'Write CDN' },
                      { value: 'UPLOAD_FILES', label: 'Upload Files' },
                      { value: 'MANAGE_CACHE', label: 'Manage Cache' },
                      { value: 'VIEW_ANALYTICS', label: 'View Analytics' },
                      { value: 'ADMIN', label: 'Admin Access' },
                    ].map((permission) => (
                      <label
                        key={permission.value}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          value={permission.value}
                          {...register('permissions', {
                            required: 'At least one permission is required',
                          })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{permission.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.permissions && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.permissions.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      reset()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Token'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tokens List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tokens.map((token) => (
            <Card
              key={token.id}
              className={!token.isActive ? 'opacity-50' : ''}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Key className="h-5 w-5 mr-2" />
                      {token.name}
                    </CardTitle>
                    <CardDescription>
                      Created {formatDate(token.createdAt)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={token.isActive ? 'default' : 'secondary'}>
                      {token.isActive ? 'Active' : 'Revoked'}
                    </Badge>
                    {token.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevokeToken(token.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Token ID */}
                <div>
                  <Label>Token ID</Label>
                  <p className="font-mono text-sm text-gray-600 dark:text-gray-300">
                    {token.id}
                  </p>
                </div>

                {/* Permissions */}
                <div>
                  <Label>Permissions</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {token.permissions.map((permission) => (
                      <Badge
                        key={permission}
                        className={getPermissionColor(permission)}
                        variant="outline"
                      >
                        {permission.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Expiration */}
                {token.expiresAt && (
                  <div>
                    <Label>Expires</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(token.expiresAt)}
                    </p>
                  </div>
                )}

                {/* Usage Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label>Total Requests</Label>
                    <p className="text-lg font-semibold flex items-center">
                      <Activity className="h-4 w-4 mr-1 text-blue-500" />
                      {formatNumber(token.usage.totalRequests)}
                    </p>
                  </div>
                  <div>
                    <Label>Total Bandwidth</Label>
                    <p className="text-lg font-semibold flex items-center">
                      <Database className="h-4 w-4 mr-1 text-green-500" />
                      {formatBytes(token.usage.totalBandwidth)}
                    </p>
                  </div>
                </div>

                {/* Current Usage */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Monthly Requests</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {formatNumber(token.usage.monthlyRequests)} /{' '}
                      {formatNumber(token.limits.requestsPerMonth)}
                    </p>
                  </div>
                  <div>
                    <Label>Monthly Bandwidth</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {formatBytes(token.usage.monthlyBandwidth)} /{' '}
                      {formatBytes(token.limits.bandwidthPerMonth)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {tokens.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Key className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No API Tokens</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Create your first API token to start using the WCDN API
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Token
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
