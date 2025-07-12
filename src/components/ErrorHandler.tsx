import { memo } from 'react'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { AlertTriangle, X, RefreshCw, Info } from 'lucide-react'
import { Button } from './ui/button'
import { WalrusCDNError } from '../../packages/sdk/src/types'

interface ErrorHandlerProps {
  error: WalrusCDNError | string | null
  onRetry?: () => void
  onDismiss?: () => void
  showRetry?: boolean
  className?: string
}

const getErrorIcon = (type?: string) => {
  switch (type) {
    case 'validation_error':
    case 'permission_error':
      return <AlertTriangle className="h-4 w-4" />
    case 'rate_limit_error':
      return <RefreshCw className="h-4 w-4" />
    default:
      return <AlertTriangle className="h-4 w-4" />
  }
}

const getErrorSeverity = (type?: string) => {
  switch (type) {
    case 'validation_error':
      return 'warning'
    case 'authentication_error':
    case 'permission_error':
      return 'destructive'
    case 'rate_limit_error':
      return 'warning'
    case 'not_found_error':
      return 'default'
    default:
      return 'destructive'
  }
}

const getErrorTitle = (type?: string, code?: string) => {
  switch (type) {
    case 'validation_error':
      return 'Invalid Input'
    case 'authentication_error':
      return 'Authentication Failed'
    case 'permission_error':
      return 'Access Denied'
    case 'not_found_error':
      return 'Not Found'
    case 'rate_limit_error':
      return 'Rate Limit Exceeded'
    case 'network_error':
      return 'Network Error'
    case 'api_error':
      return 'Server Error'
    default:
      return code || 'Error'
  }
}

const getErrorSuggestion = (type?: string, code?: string) => {
  switch (type) {
    case 'validation_error':
      return 'Please check your input and try again.'
    case 'authentication_error':
      return 'Please check your API key and try again.'
    case 'permission_error':
      return 'You do not have permission to perform this action.'
    case 'not_found_error':
      return 'The requested resource was not found.'
    case 'rate_limit_error':
      return 'Please wait a moment before trying again.'
    case 'network_error':
      return 'Please check your internet connection and try again.'
    case 'api_error':
      return 'Please try again later or contact support.'
    default:
      return null
  }
}

export const ErrorHandler = memo(function ErrorHandler({
  error,
  onRetry,
  onDismiss,
  showRetry = false,
  className = ''
}: ErrorHandlerProps) {
  if (!error) return null

  // Handle different error types
  let errorData: {
    type?: string
    code?: string
    message: string
    status?: number
    param?: string
  }

  if (error instanceof WalrusCDNError) {
    errorData = {
      type: error.type,
      code: error.code,
      message: error.message,
      status: error.status,
      param: error.param
    }
  } else if (typeof error === 'string') {
    errorData = {
      message: error
    }
  } else {
    errorData = {
      message: 'An unknown error occurred'
    }
  }

  const icon = getErrorIcon(errorData.type)
  const severity = getErrorSeverity(errorData.type)
  const title = getErrorTitle(errorData.type, errorData.code)
  const suggestion = getErrorSuggestion(errorData.type, errorData.code)

  return (
    <Alert variant={severity as any} className={`relative ${className}`}>
      {icon}
      <AlertTitle className="flex items-center justify-between">
        {title}
        <div className="flex items-center gap-2">
          {showRetry && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <div>{errorData.message}</div>
        
        {suggestion && (
          <div className="text-sm text-muted-foreground flex items-start gap-2">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            {suggestion}
          </div>
        )}
        
        {/* Developer information for debugging */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Debug Information
            </summary>
            <div className="mt-2 space-y-1 font-mono">
              {errorData.type && <div>Type: {errorData.type}</div>}
              {errorData.code && <div>Code: {errorData.code}</div>}
              {errorData.status && <div>Status: {errorData.status}</div>}
              {errorData.param && <div>Parameter: {errorData.param}</div>}
            </div>
          </details>
        )}
      </AlertDescription>
    </Alert>
  )
})

// Specialized error handlers for common scenarios

export const ValidationErrorHandler = memo(function ValidationErrorHandler({
  error,
  onRetry,
  onDismiss
}: Omit<ErrorHandlerProps, 'showRetry'>) {
  return (
    <ErrorHandler
      error={error}
      onRetry={onRetry}
      onDismiss={onDismiss}
      showRetry={false}
    />
  )
})

export const NetworkErrorHandler = memo(function NetworkErrorHandler({
  error,
  onRetry,
  onDismiss
}: Omit<ErrorHandlerProps, 'showRetry'>) {
  return (
    <ErrorHandler
      error={error}
      onRetry={onRetry}
      onDismiss={onDismiss}
      showRetry={true}
    />
  )
})

export const RateLimitErrorHandler = memo(function RateLimitErrorHandler({
  error,
  onDismiss,
  retryAfter = 60
}: Omit<ErrorHandlerProps, 'onRetry' | 'showRetry'> & { retryAfter?: number }) {
  return (
    <Alert variant="warning">
      <RefreshCw className="h-4 w-4" />
      <AlertTitle>Rate Limit Exceeded</AlertTitle>
      <AlertDescription className="space-y-2">
        <div>You have made too many requests. Please wait before trying again.</div>
        <div className="text-sm text-muted-foreground">
          Retry after: {retryAfter} seconds
        </div>
        {onDismiss && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDismiss}
            className="mt-2"
          >
            Dismiss
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
})

// Helper hook for error handling
export const useErrorHandler = () => {
  const handleError = (error: unknown) => {
    if (error instanceof WalrusCDNError) {
      // Handle v1 API errors
      console.error('WCDN API Error:', {
        type: error.type,
        code: error.code,
        message: error.message,
        status: error.status,
        param: error.param
      })
      
      return error
    } else if (error instanceof Error) {
      // Handle generic errors
      console.error('Generic Error:', error.message)
      return error.message
    } else {
      // Handle unknown errors
      console.error('Unknown Error:', error)
      return 'An unknown error occurred'
    }
  }

  const isRetryableError = (error: unknown) => {
    if (error instanceof WalrusCDNError) {
      return ['network_error', 'api_error', 'rate_limit_error'].includes(error.type || '')
    }
    return false
  }

  const shouldShowRetry = (error: unknown) => {
    return isRetryableError(error)
  }

  return {
    handleError,
    isRetryableError,
    shouldShowRetry
  }
}