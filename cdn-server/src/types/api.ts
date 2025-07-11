export interface StripeResource {
  id: string
  object: string
  created: number
}

export interface PaginationParams {
  limit?: number
  starting_after?: string
  ending_before?: string
}

export interface PaginatedResponse<T> {
  object: 'list'
  data: T[]
  has_more: boolean
  url: string
}

export interface ApiError {
  error: {
    type: string
    message: string
    code?: string
    param?: string
  }
}

export type ErrorType = 
  | 'validation_error'
  | 'authentication_error'
  | 'permission_error'
  | 'not_found_error'
  | 'rate_limit_error'
  | 'api_error'
  | 'network_error'

export interface BlobResource extends StripeResource {
  object: 'blob'
  cid: string
  size: number
  content_type: string
  cached: boolean
  pinned: boolean
  cache_date?: number
  ttl?: number
  source?: string
}

export interface UploadResource extends StripeResource {
  object: 'upload'
  filename: string
  size: number
  content_type: string
  blob_id: string
  status: 'processing' | 'completed' | 'failed'
  vault_id?: string
  parent_id?: string
}

export interface CacheResource extends StripeResource {
  object: 'cache'
  blob_id: string
  size: number
  pinned: boolean
  ttl: number
  expires_at: number
  last_accessed: number
}

export interface AnalyticsResource extends StripeResource {
  object: 'analytics'
  blob_id: string
  total_requests: number
  cache_hits: number
  cache_misses: number
  total_bytes_served: number
  last_accessed: number
  geographic_stats: Record<string, number>
}