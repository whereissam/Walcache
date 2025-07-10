export interface WalrusBlob {
  cid: string
  data: Buffer
  contentType: string
  size: number
  timestamp: Date
  source: 'walrus' | 'ipfs'
}

export interface WalrusBlobObject {
  blobId: string
  id: string
}

export interface WalrusUploadNewlyCreated {
  newlyCreated: {
    blobObject: WalrusBlobObject
  }
}

export interface WalrusUploadAlreadyCertified {
  alreadyCertified: {
    blobId: string
    event: {
      txDigest: string
    }
  }
}

export type WalrusUploadResponse =
  | WalrusUploadNewlyCreated
  | WalrusUploadAlreadyCertified

// Legacy error class - use BaseError instead
export class WalrusError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message)
    this.name = 'WalrusError'
  }
}

export const WALRUS_ERROR_CODES = {
  BLOB_NOT_AVAILABLE_YET: 'BLOB_NOT_AVAILABLE_YET',
  BLOB_NOT_FOUND: 'BLOB_NOT_FOUND',
  AGGREGATOR_ERROR: 'AGGREGATOR_ERROR',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
} as const
