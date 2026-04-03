import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { BlockchainIntegrator } from '../../packages/sdk/src/blockchain.js'
import type { SupportedChain } from '../../packages/sdk/src/types.js'
import { getCDNClient } from './blobStore'
import { useBlobStore } from './blobStore'

interface BlockchainVerificationResult {
  blobId: string
  chain: SupportedChain
  verified: boolean
  transactionHash?: string
  uploader?: string
  timestamp?: string
  error?: string
}

interface MultiChainStatus {
  blobId: string
  chains: Record<SupportedChain, BlockchainVerificationResult>
  consensus: 'none' | 'minority' | 'majority' | 'unanimous'
  trustedChains: Array<SupportedChain>
}

interface BlockchainState {
  blockchainIntegrator: BlockchainIntegrator | null
  supportedChains: Array<SupportedChain>
  verificationResults: Record<string, MultiChainStatus>
  registrationProgress: Record<
    string,
    {
      chain: SupportedChain
      status: 'pending' | 'completed' | 'failed'
      txHash?: string
    }
  >

  // Actions
  initializeBlockchainIntegrator: (configs: Record<SupportedChain, any>) => void
  registerBlobOnChain: (
    blobId: string,
    metadata: any,
    chain: SupportedChain,
  ) => Promise<string>
  registerBlobBatch: (
    blobs: Array<{ blobId: string; metadata: any }>,
    chain: SupportedChain,
  ) => Promise<string>
  verifyBlobOnChain: (
    blobId: string,
    chain: SupportedChain,
  ) => Promise<BlockchainVerificationResult>
  verifyMultiChain: (
    blobId: string,
    chains?: Array<SupportedChain>,
  ) => Promise<MultiChainStatus>
  getBlobRegistrationStatus: (
    blobId: string,
    chain: SupportedChain,
  ) => Promise<{ registered: boolean; txHash?: string }>
  uploadAndRegisterOnChain: (
    file: File,
    chain: SupportedChain,
    vaultId?: string,
  ) => Promise<{
    upload: any
    txHash: string
    verified: boolean
    cdnUrl: string
  }>
}

export type { BlockchainVerificationResult, MultiChainStatus }

export const useBlockchainStore = create<BlockchainState>()(
  devtools(
    (set, get) => ({
      blockchainIntegrator: null,
      supportedChains: ['ethereum', 'sui'] as Array<SupportedChain>,
      verificationResults: {},
      registrationProgress: {},

      initializeBlockchainIntegrator: (configs) => {
        try {
          const integrator = new BlockchainIntegrator(configs)
          set({ blockchainIntegrator: integrator })
        } catch (error) {
          console.error('Failed to initialize blockchain integrator:', error)
        }
      },

      registerBlobOnChain: async (blobId, metadata, chain) => {
        const { blockchainIntegrator } = get()
        if (!blockchainIntegrator) {
          throw new Error('Blockchain integrator not initialized')
        }

        const registrationId = `${blobId}-${chain}`
        set((state) => ({
          registrationProgress: {
            ...state.registrationProgress,
            [registrationId]: { chain, status: 'pending' },
          },
        }))

        try {
          const results = await blockchainIntegrator.registerBlobMultiChain(
            blobId,
            metadata.size || 0,
            metadata.contentType || 'application/octet-stream',
            metadata.cdnUrl || '',
            metadata.contentHash || '',
          )
          const txHash = results[chain] ?? undefined

          set((state) => ({
            registrationProgress: {
              ...state.registrationProgress,
              [registrationId]: { chain, status: 'completed', txHash },
            },
          }))

          return txHash
        } catch (error) {
          set((state) => ({
            registrationProgress: {
              ...state.registrationProgress,
              [registrationId]: { chain, status: 'failed' },
            },
          }))
          throw error
        }
      },

      registerBlobBatch: async (blobs, chain) => {
        const { blockchainIntegrator } = get()
        if (!blockchainIntegrator) {
          throw new Error('Blockchain integrator not initialized')
        }

        // Register each blob individually on the specified chain
        let lastTxHash: string | undefined
        for (const blob of blobs) {
          const result = await blockchainIntegrator.registerBlobMultiChain(
            blob.blobId,
            blob.metadata.size || 0,
            blob.metadata.contentType || 'application/octet-stream',
            blob.metadata.cdnUrl || '',
            blob.metadata.contentHash || '',
          )
          lastTxHash = result[chain] ?? undefined
        }
        return lastTxHash
      },

      verifyBlobOnChain: async (blobId, chain) => {
        const { blockchainIntegrator } = get()
        if (!blockchainIntegrator) {
          throw new Error('Blockchain integrator not initialized')
        }

        try {
          const result =
            await blockchainIntegrator.verifyBlobExistsAnyChain(blobId)
          return {
            blobId,
            chain,
            verified: result.exists,
            transactionHash: undefined,
            uploader: undefined,
            timestamp: undefined,
          }
        } catch (error) {
          return {
            blobId,
            chain,
            verified: false,
            error:
              error instanceof Error ? error.message : 'Verification failed',
          }
        }
      },

      verifyMultiChain: async (blobId, chains?) => {
        const { supportedChains } = get()
        const targetChains = chains || supportedChains

        const results = await Promise.all(
          targetChains.map((chain) => get().verifyBlobOnChain(blobId, chain)),
        )

        const chainResults = {} as Record<
          SupportedChain,
          BlockchainVerificationResult
        >
        results.forEach((result) => {
          chainResults[result.chain] = result
        })

        const verifiedChains = results
          .filter((r) => r.verified)
          .map((r) => r.chain)
        const totalChains = targetChains.length
        const verifiedCount = verifiedChains.length

        let consensus: 'none' | 'minority' | 'majority' | 'unanimous'
        if (verifiedCount === 0) consensus = 'none'
        else if (verifiedCount < totalChains / 2) consensus = 'minority'
        else if (verifiedCount < totalChains) consensus = 'majority'
        else consensus = 'unanimous'

        const multiChainStatus: MultiChainStatus = {
          blobId,
          chains: chainResults,
          consensus,
          trustedChains: verifiedChains,
        }

        set((state) => ({
          verificationResults: {
            ...state.verificationResults,
            [blobId]: multiChainStatus,
          },
        }))

        return multiChainStatus
      },

      getBlobRegistrationStatus: async (blobId, _chain) => {
        const { blockchainIntegrator } = get()
        if (!blockchainIntegrator) {
          throw new Error('Blockchain integrator not initialized')
        }

        try {
          const result =
            await blockchainIntegrator.verifyBlobExistsAnyChain(blobId)
          return {
            registered: result.exists,
            txHash: undefined,
          }
        } catch {
          return { registered: false }
        }
      },

      uploadAndRegisterOnChain: async (file, chain, vaultId?) => {
        const blobStore = useBlobStore.getState()
        blobStore.setLoading(true)
        blobStore.setError(null)

        try {
          // Step 1: Upload file
          const upload = await blobStore.createUpload(file, {
            vault_id: vaultId,
          })

          // Step 2: Register on blockchain
          const client = getCDNClient()
          const metadata = {
            size: upload.size,
            contentType: upload.content_type,
            cdnUrl: client.getCDNUrl(upload.blob_id),
            contentHash: upload.blob_id,
          }

          const txHash = await get().registerBlobOnChain(
            upload.blob_id,
            metadata,
            chain,
          )

          // Step 3: Verify registration
          const verification = await get().verifyBlobOnChain(
            upload.blob_id,
            chain,
          )

          blobStore.setLoading(false)

          return {
            upload,
            txHash,
            verified: verification.verified,
            cdnUrl: client.getCDNUrl(upload.blob_id),
          }
        } catch (error) {
          blobStore.setError(
            error instanceof Error
              ? error.message
              : 'Upload and registration failed',
          )
          blobStore.setLoading(false)
          throw error
        }
      },
    }),
    { name: 'blockchain-store' },
  ),
)
