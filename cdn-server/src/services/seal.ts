import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client'
import { SealClient, getAllowlistedKeyServers } from '@mysten/seal'
import type { AppConfig } from '../config/config-loader.js'

export interface SealEncryptOptions {
  /** Threshold for decryption (how many key servers needed) */
  threshold?: number
  /** Package ID containing seal_approve functions */
  packageId: string
  /** Identity/content ID for access control */
  id: string
  /** Additional metadata for access control */
  metadata?: Record<string, any>
}

export interface SealEncryptResult {
  /** Encrypted data ready for storage */
  encryptedObject: Uint8Array
  /** Backup key for disaster recovery */
  backupKey: string
  /** Original data size */
  originalSize: number
  /** Encryption metadata */
  metadata: {
    packageId: string
    id: string
    threshold: number
    keyServerIds: string[]
    timestamp: number
  }
}

export interface SealDecryptOptions {
  /** Encrypted data to decrypt */
  encryptedData: Uint8Array
  /** Transaction bytes for seal_approve call */
  txBytes: Uint8Array
  /** Session key for authorization */
  sessionKey: any // SessionKey from @mysten/seal
}

export class SealService {
  private suiClient: SuiClient
  private sealClient: SealClient | null = null
  private config: AppConfig
  private keyServerIds: string[] = []

  constructor(config: AppConfig) {
    this.config = config
    this.suiClient = new SuiClient({ 
      url: getFullnodeUrl(config.walrus.network === 'mainnet' ? 'mainnet' : 'testnet') 
    })
  }

  /**
   * Initialize the Seal service with key servers
   */
  async initialize(): Promise<void> {
    try {
      // Get allowlisted key servers for the network
      const network = this.config.walrus.network === 'mainnet' ? 'mainnet' : 'testnet'
      this.keyServerIds = getAllowlistedKeyServers(network)

      // Create Seal client with key servers
      this.sealClient = new SealClient({
        suiClient: this.suiClient,
        serverConfigs: this.keyServerIds.map((id) => ({
          objectId: id,
          weight: 1, // Equal weight for all servers
        })),
        verifyKeyServers: true, // Verify servers for security
      })

      console.log(`✅ Seal service initialized with ${this.keyServerIds.length} key servers`)
    } catch (error) {
      console.error('❌ Failed to initialize Seal service:', error)
      throw new Error(`Seal initialization failed: ${error}`)
    }
  }

  /**
   * Encrypt data using Seal
   */
  async encryptData(data: Buffer, options: SealEncryptOptions): Promise<SealEncryptResult> {
    if (!this.sealClient) {
      throw new Error('Seal service not initialized. Call initialize() first.')
    }

    try {
      const threshold = options.threshold || Math.ceil(this.keyServerIds.length / 2) // Default to majority
      
      // Convert hex string to Uint8Array if needed
      const packageIdBytes = options.packageId.startsWith('0x') 
        ? this.hexToUint8Array(options.packageId)
        : new TextEncoder().encode(options.packageId)
      
      const idBytes = typeof options.id === 'string'
        ? this.hexToUint8Array(options.id)
        : options.id

      // Encrypt the data
      const result = await this.sealClient.encrypt({
        threshold,
        packageId: packageIdBytes,
        id: idBytes,
        data: new Uint8Array(data),
      })

      return {
        encryptedObject: result.encryptedObject,
        backupKey: this.uint8ArrayToHex(result.key),
        originalSize: data.length,
        metadata: {
          packageId: options.packageId,
          id: options.id,
          threshold,
          keyServerIds: this.keyServerIds,
          timestamp: Date.now(),
        },
      }
    } catch (error) {
      console.error('❌ Seal encryption failed:', error)
      throw new Error(`Encryption failed: ${error}`)
    }
  }

  /**
   * Decrypt data using Seal
   */
  async decryptData(options: SealDecryptOptions): Promise<Buffer> {
    if (!this.sealClient) {
      throw new Error('Seal service not initialized. Call initialize() first.')
    }

    try {
      const decryptedBytes = await this.sealClient.decrypt({
        data: options.encryptedData,
        sessionKey: options.sessionKey,
        txBytes: options.txBytes,
      })

      return Buffer.from(decryptedBytes)
    } catch (error) {
      console.error('❌ Seal decryption failed:', error)
      throw new Error(`Decryption failed: ${error}`)
    }
  }

  /**
   * Check if Seal service is ready
   */
  isReady(): boolean {
    return this.sealClient !== null && this.keyServerIds.length > 0
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isReady(),
      network: this.config.walrus.network,
      keyServerCount: this.keyServerIds.length,
      keyServerIds: this.keyServerIds,
    }
  }

  /**
   * Helper: Convert hex string to Uint8Array
   */
  private hexToUint8Array(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
    const bytes = new Uint8Array(cleanHex.length / 2)
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16)
    }
    return bytes
  }

  /**
   * Helper: Convert Uint8Array to hex string
   */
  private uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Generate a random content ID for access control
   */
  generateContentId(): string {
    const randomBytes = new Uint8Array(16)
    crypto.getRandomValues(randomBytes)
    return this.uint8ArrayToHex(randomBytes)
  }

  /**
   * Validate package ID format
   */
  validatePackageId(packageId: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(packageId)
  }
}

export default SealService