export interface WalrusBlob {
  cid: string;
  data: Buffer;
  contentType: string;
  size: number;
  timestamp: Date;
}

export class WalrusError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'WalrusError';
  }
}