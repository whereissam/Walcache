import { Tusky } from '@tusky-io/ts-sdk';
import { config } from '../config/index.js';

export interface TuskyVault {
  id: string;
  name: string;
  description?: string;
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  membersCount: number;
  filesCount: number;
  storageUsed: number;
}

export interface TuskyFile {
  id: string;
  name: string;
  size: number;
  type: string;
  vaultId: string;
  parentId?: string;
  blobId: string;
  storedEpoch: number;
  certifiedEpoch: number;
  ref: string;
  erasureCodeType: string;
  status: 'active' | 'revoked' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface TuskyUploadResponse {
  id: string;
  status: 'completed';
  file: TuskyFile;
}

class TuskyService {
  private tusky: Tusky | null = null;
  private defaultVaultId: string | undefined;

  constructor() {
    try {
      if (config.TUSKY_API_KEY) {
        console.log('Initializing Tusky SDK with API key...');
        this.tusky = new Tusky({ apiKey: config.TUSKY_API_KEY });
        console.log('Tusky SDK initialized successfully');
      } else {
        console.log('No Tusky API key configured');
      }
      this.defaultVaultId = config.TUSKY_DEFAULT_VAULT_ID;
    } catch (error) {
      console.error('Failed to initialize Tusky SDK:', error);
    }
  }

  private getTusky(): Tusky {
    if (!this.tusky) {
      throw new Error('Tusky API key not configured');
    }
    return this.tusky;
  }

  async createVault(name: string, description?: string): Promise<TuskyVault> {
    try {
      const tusky = this.getTusky();
      const vault = await tusky.vault.create(name, { 
        encrypted: false,
        ...(description && { description })
      });
      
      return {
        id: vault.id,
        name: vault.name,
        description: vault.description,
        isEncrypted: vault.encrypted || false,
        createdAt: vault.createdAt,
        updatedAt: vault.updatedAt,
        isOwner: true,
        membersCount: 1,
        filesCount: 0,
        storageUsed: vault.size || 0,
      };
    } catch (error: any) {
      throw new Error(`Failed to create vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getVaults(): Promise<TuskyVault[]> {
    try {
      console.log('Getting vaults with fallback to API...');
      
      // Fallback to direct API call for now due to SDK compatibility issues
      const response = await fetch(`${config.TUSKY_API_URL}/vaults`, {
        headers: {
          'Api-Key': config.TUSKY_API_KEY!,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const vaults = data.items || [];
      console.log(`Found ${vaults.length} vaults via API`);
      
      // Map API response to our interface and get file counts
      const mappedVaults = await Promise.all(
        vaults.map(async (vault: any) => {
          // Get file count for each vault
          let filesCount = 0;
          try {
            console.log(`Getting file count for vault ${vault.id}...`);
            const files = await this.getFiles(vault.id);
            filesCount = files.length;
            console.log(`Vault ${vault.name} has ${filesCount} files`);
          } catch (error) {
            console.warn(`Failed to get file count for vault ${vault.id}:`, error);
          }
          
          return {
            id: vault.id,
            name: vault.name,
            description: vault.description || undefined,
            isEncrypted: vault.encrypted || false,
            createdAt: new Date(parseInt(vault.createdAt)).toISOString(),
            updatedAt: new Date(parseInt(vault.updatedAt)).toISOString(),
            isOwner: true,
            membersCount: 1,
            filesCount,
            storageUsed: vault.size || 0,
          };
        })
      );
      
      console.log('Vaults mapped successfully');
      return mappedVaults;
    } catch (error) {
      console.error('Error getting vaults:', error);
      throw new Error(`Failed to get vaults: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getVault(vaultId: string): Promise<TuskyVault> {
    try {
      const tusky = this.getTusky();
      const vault = await tusky.vault.get(vaultId);
      
      // Get file count
      let filesCount = 0;
      try {
        const files = await tusky.file.listAll({ vaultId });
        filesCount = files.length;
      } catch (error) {
        console.warn(`Failed to get file count for vault ${vaultId}:`, error);
      }
      
      return {
        id: vault.id,
        name: vault.name,
        description: vault.description || undefined,
        isEncrypted: vault.encrypted || false,
        createdAt: vault.createdAt,
        updatedAt: vault.updatedAt,
        isOwner: true,
        membersCount: 1,
        filesCount,
        storageUsed: vault.size || 0,
      };
    } catch (error) {
      throw new Error(`Failed to get vault: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
    vaultId?: string
  ): Promise<TuskyFile> {
    const targetVaultId = vaultId || this.defaultVaultId;
    
    if (!targetVaultId) {
      throw new Error('No vault ID provided and no default vault configured');
    }

    try {
      const tusky = this.getTusky();
      
      // Create a Blob from the buffer
      const blob = new Blob([fileBuffer], { type: contentType });
      
      // Upload using the SDK
      const uploadId = await tusky.file.upload(targetVaultId, blob, {
        name: fileName,
        mimeType: contentType,
      });
      
      // Get the file metadata
      const fileMetadata = await tusky.file.get(uploadId);
      
      return {
        id: fileMetadata.id,
        name: fileMetadata.name,
        size: fileMetadata.size,
        type: fileMetadata.mimeType || contentType,
        vaultId: fileMetadata.vaultId,
        parentId: fileMetadata.parentId,
        blobId: fileMetadata.blobId || uploadId,
        storedEpoch: fileMetadata.storedEpoch || 0,
        certifiedEpoch: fileMetadata.certifiedEpoch || 0,
        ref: fileMetadata.ref || '',
        erasureCodeType: fileMetadata.erasureCodeType || '',
        status: fileMetadata.status || 'active',
        createdAt: fileMetadata.createdAt,
        updatedAt: fileMetadata.updatedAt,
      };

    } catch (error: any) {
      console.error('Upload error details:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  async getFiles(vaultId?: string, parentId?: string): Promise<TuskyFile[]> {
    try {
      console.log('Getting files with API fallback...');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (vaultId) params.append('vaultId', vaultId);
      if (parentId) params.append('parentId', parentId);
      
      const response = await fetch(`${config.TUSKY_API_URL}/files?${params.toString()}`, {
        headers: {
          'Api-Key': config.TUSKY_API_KEY!,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const files = data.items || [];
      console.log(`Found ${files.length} files via API`);
      
      // Map API response to our interface
      return files.map((file: any) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.mimeType || 'application/octet-stream',
        vaultId: file.vaultId,
        parentId: file.parentId,
        blobId: file.blobId,
        storedEpoch: file.storedEpoch || 0,
        certifiedEpoch: file.certifiedEpoch || 0,
        ref: file.ref || '',
        erasureCodeType: file.erasureCodeType || '',
        status: file.status || 'active',
        createdAt: new Date(parseInt(file.createdAt)).toISOString(),
        updatedAt: new Date(parseInt(file.updatedAt)).toISOString(),
      }));
    } catch (error) {
      console.error('Error getting files:', error);
      throw new Error(`Failed to get files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFile(fileId: string): Promise<TuskyFile> {
    try {
      const tusky = this.getTusky();
      const file = await tusky.file.get(fileId);
      
      return {
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.mimeType || 'application/octet-stream',
        vaultId: file.vaultId,
        parentId: file.parentId,
        blobId: file.blobId,
        storedEpoch: file.storedEpoch || 0,
        certifiedEpoch: file.certifiedEpoch || 0,
        ref: file.ref || '',
        erasureCodeType: file.erasureCodeType || '',
        status: file.status || 'active',
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      };
    } catch (error) {
      throw new Error(`Failed to get file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const tusky = this.getTusky();
      await tusky.file.delete(fileId);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isConfigured(): boolean {
    return !!this.tusky;
  }

  getDefaultVaultId(): string | undefined {
    return this.defaultVaultId;
  }

  async downloadFile(fileId: string): Promise<Buffer | null> {
    if (!this.isConfigured()) {
      throw new Error('Tusky service not configured');
    }
    
    try {
      const tusky = this.getTusky();
      const arrayBuffer = await tusky.file.arrayBuffer(fileId);
      return Buffer.from(arrayBuffer);
    } catch (error) {
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  healthCheck(): { configured: boolean; apiUrl: string; hasVault: boolean } {
    return {
      configured: this.isConfigured(),
      apiUrl: config.TUSKY_API_URL,
      hasVault: !!this.defaultVaultId
    };
  }
}

export const tuskyService = new TuskyService();