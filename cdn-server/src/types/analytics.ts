export interface AnalyticsEvent {
  type: 'fetch' | 'preload' | 'pin' | 'unpin';
  cid?: string;
  cids?: string[];
  timestamp: Date;
  hit?: boolean;
  latency?: number;
  size?: number;
}

export interface CIDStats {
  cid: string;
  requests: number;
  hits: number;
  misses: number;
  hitRate: number;
  avgLatency: number;
  firstAccess: Date;
  lastAccess: Date;
  totalSize: number;
}