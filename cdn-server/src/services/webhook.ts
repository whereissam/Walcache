/**
 * Webhook Service for WCDN
 * Handles webhook notifications for various events
 */

import crypto from 'crypto';
import { z } from 'zod';

// =============================================================================
// TYPES AND SCHEMAS
// =============================================================================

export type WebhookEvent = 
  | 'blob.uploaded'
  | 'blob.cached'
  | 'blob.evicted'
  | 'blob.pinned'
  | 'blob.unpinned'
  | 'blob.verified'
  | 'cache.cleared'
  | 'blockchain.registered'
  | 'analytics.threshold';

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  active: boolean;
  headers?: Record<string, string>;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: number;
  data: any;
  metadata?: {
    source: string;
    version: string;
    environment?: string;
  };
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  payload: WebhookPayload;
  attempt: number;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  response?: {
    status: number;
    headers: Record<string, string>;
    body: string;
  };
  error?: string;
  deliveredAt?: Date;
  nextRetryAt?: Date;
}

// Validation schemas
const webhookEndpointSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  secret: z.string().min(32, 'Secret must be at least 32 characters'),
  events: z.array(z.enum([
    'blob.uploaded', 'blob.cached', 'blob.evicted', 'blob.pinned', 'blob.unpinned',
    'blob.verified', 'cache.cleared', 'blockchain.registered', 'analytics.threshold'
  ])).min(1, 'At least one event must be selected'),
  active: z.boolean().default(true),
  headers: z.record(z.string()).optional(),
  retryPolicy: z.object({
    maxRetries: z.number().min(0).max(10).default(3),
    backoffMultiplier: z.number().min(1).max(5).default(2),
    initialDelay: z.number().min(1000).max(60000).default(1000),
  }).default({}),
  rateLimit: z.object({
    requests: z.number().min(1).max(1000).default(100),
    window: z.number().min(60).max(3600).default(3600),
  }).optional(),
});

// =============================================================================
// WEBHOOK SERVICE CLASS
// =============================================================================

export class WebhookService {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private rateLimitCounters: Map<string, { count: number; resetAt: number }> = new Map();
  private retryQueue: WebhookDelivery[] = [];
  private retryTimer?: NodeJS.Timeout;

  constructor() {
    this.startRetryProcessor();
  }

  // =============================================================================
  // ENDPOINT MANAGEMENT
  // =============================================================================

  /**
   * Create a new webhook endpoint
   */
  async createEndpoint(input: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    const validated = webhookEndpointSchema.parse(input);
    
    const endpoint: WebhookEndpoint = {
      id: crypto.randomUUID(),
      ...validated,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.endpoints.set(endpoint.id, endpoint);
    return endpoint;
  }

  /**
   * Update webhook endpoint
   */
  async updateEndpoint(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    const existing = this.endpoints.get(id);
    if (!existing) {
      throw new Error('Webhook endpoint not found');
    }

    const validated = webhookEndpointSchema.partial().parse(updates);
    const updated: WebhookEndpoint = {
      ...existing,
      ...validated,
      updatedAt: new Date(),
    };

    this.endpoints.set(id, updated);
    return updated;
  }

  /**
   * Delete webhook endpoint
   */
  async deleteEndpoint(id: string): Promise<void> {
    if (!this.endpoints.has(id)) {
      throw new Error('Webhook endpoint not found');
    }
    this.endpoints.delete(id);
  }

  /**
   * Get webhook endpoint
   */
  getEndpoint(id: string): WebhookEndpoint | undefined {
    return this.endpoints.get(id);
  }

  /**
   * List all webhook endpoints
   */
  listEndpoints(): WebhookEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  // =============================================================================
  // EVENT DISPATCHING
  // =============================================================================

  /**
   * Send webhook notification for an event
   */
  async sendWebhook(event: WebhookEvent, data: any, metadata?: any): Promise<void> {
    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      event,
      timestamp: Date.now(),
      data,
      metadata: {
        source: 'wcdn',
        version: '1.0.0',
        ...metadata,
      },
    };

    // Find matching endpoints
    const matchingEndpoints = Array.from(this.endpoints.values())
      .filter(endpoint => endpoint.active && endpoint.events.includes(event));

    if (matchingEndpoints.length === 0) {
      console.log(`No webhooks configured for event: ${event}`);
      return;
    }

    // Send to each endpoint
    const deliveryPromises = matchingEndpoints.map(endpoint => 
      this.deliverWebhook(endpoint, payload)
    );

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Deliver webhook to specific endpoint
   */
  private async deliverWebhook(endpoint: WebhookEndpoint, payload: WebhookPayload): Promise<void> {
    // Check rate limit
    if (endpoint.rateLimit && this.isRateLimited(endpoint)) {
      console.warn(`Rate limit exceeded for webhook ${endpoint.id}`);
      return;
    }

    const delivery: WebhookDelivery = {
      id: crypto.randomUUID(),
      webhookId: endpoint.id,
      payload,
      attempt: 1,
      status: 'pending',
    };

    this.deliveries.set(delivery.id, delivery);

    try {
      await this.executeDelivery(endpoint, delivery);
    } catch (error) {
      console.error(`Webhook delivery failed for ${endpoint.id}:`, error.message);
      this.scheduleRetry(delivery);
    }
  }

  /**
   * Execute webhook delivery
   */
  private async executeDelivery(endpoint: WebhookEndpoint, delivery: WebhookDelivery): Promise<void> {
    const signature = this.generateSignature(delivery.payload, endpoint.secret);
    
    const headers = {
      'Content-Type': 'application/json',
      'X-WCDN-Signature': signature,
      'X-WCDN-Event': delivery.payload.event,
      'X-WCDN-Delivery': delivery.id,
      'X-WCDN-Timestamp': delivery.payload.timestamp.toString(),
      'User-Agent': 'WCDN-Webhook/1.0',
      ...endpoint.headers,
    };

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(delivery.payload),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    delivery.response = {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text().catch(() => ''),
    };

    if (response.ok) {
      delivery.status = 'delivered';
      delivery.deliveredAt = new Date();
      this.updateRateLimit(endpoint);
    } else {
      delivery.status = 'failed';
      delivery.error = `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(delivery.error);
    }

    this.deliveries.set(delivery.id, delivery);
  }

  // =============================================================================
  // RETRY LOGIC
  // =============================================================================

  /**
   * Schedule delivery retry
   */
  private scheduleRetry(delivery: WebhookDelivery): void {
    const endpoint = this.endpoints.get(delivery.webhookId);
    if (!endpoint || delivery.attempt >= endpoint.retryPolicy.maxRetries) {
      delivery.status = 'failed';
      this.deliveries.set(delivery.id, delivery);
      return;
    }

    const delay = endpoint.retryPolicy.initialDelay * 
      Math.pow(endpoint.retryPolicy.backoffMultiplier, delivery.attempt - 1);
    
    delivery.status = 'retrying';
    delivery.nextRetryAt = new Date(Date.now() + delay);
    delivery.attempt++;
    
    this.deliveries.set(delivery.id, delivery);
    this.retryQueue.push(delivery);
  }

  /**
   * Process retry queue
   */
  private startRetryProcessor(): void {
    this.retryTimer = setInterval(async () => {
      const now = new Date();
      const readyRetries = this.retryQueue.filter(delivery => 
        delivery.nextRetryAt && delivery.nextRetryAt <= now
      );

      if (readyRetries.length === 0) return;

      // Remove processed deliveries from queue
      this.retryQueue = this.retryQueue.filter(delivery => 
        !readyRetries.includes(delivery)
      );

      // Process retries
      for (const delivery of readyRetries) {
        const endpoint = this.endpoints.get(delivery.webhookId);
        if (!endpoint || !endpoint.active) continue;

        try {
          await this.executeDelivery(endpoint, delivery);
        } catch (error) {
          this.scheduleRetry(delivery);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  // =============================================================================
  // RATE LIMITING
  // =============================================================================

  private isRateLimited(endpoint: WebhookEndpoint): boolean {
    if (!endpoint.rateLimit) return false;

    const now = Date.now();
    const counter = this.rateLimitCounters.get(endpoint.id);

    if (!counter || counter.resetAt <= now) {
      // Reset or initialize counter
      this.rateLimitCounters.set(endpoint.id, {
        count: 0,
        resetAt: now + (endpoint.rateLimit.window * 1000),
      });
      return false;
    }

    return counter.count >= endpoint.rateLimit.requests;
  }

  private updateRateLimit(endpoint: WebhookEndpoint): void {
    if (!endpoint.rateLimit) return;

    const counter = this.rateLimitCounters.get(endpoint.id);
    if (counter) {
      counter.count++;
      this.rateLimitCounters.set(endpoint.id, counter);
    }
  }

  // =============================================================================
  // UTILITIES
  // =============================================================================

  /**
   * Generate webhook signature
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return `sha256=${signature}`;
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    const expected = `sha256=${expectedSignature}`;
    
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStats(webhookId?: string): {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    retrying: number;
    successRate: number;
  } {
    const deliveries = Array.from(this.deliveries.values())
      .filter(d => !webhookId || d.webhookId === webhookId);

    const total = deliveries.length;
    const delivered = deliveries.filter(d => d.status === 'delivered').length;
    const failed = deliveries.filter(d => d.status === 'failed').length;
    const pending = deliveries.filter(d => d.status === 'pending').length;
    const retrying = deliveries.filter(d => d.status === 'retrying').length;

    return {
      total,
      delivered,
      failed,
      pending,
      retrying,
      successRate: total > 0 ? delivered / total : 0,
    };
  }

  /**
   * Get recent deliveries
   */
  getRecentDeliveries(webhookId?: string, limit = 50): WebhookDelivery[] {
    return Array.from(this.deliveries.values())
      .filter(d => !webhookId || d.webhookId === webhookId)
      .sort((a, b) => b.payload.timestamp - a.payload.timestamp)
      .slice(0, limit);
  }

  /**
   * Cleanup old deliveries
   */
  cleanup(olderThan: Date): void {
    const cutoff = olderThan.getTime();
    
    for (const [id, delivery] of this.deliveries.entries()) {
      if (delivery.payload.timestamp < cutoff) {
        this.deliveries.delete(id);
      }
    }

    // Remove from retry queue as well
    this.retryQueue = this.retryQueue.filter(
      delivery => delivery.payload.timestamp >= cutoff
    );
  }

  /**
   * Shutdown webhook service
   */
  shutdown(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = undefined;
    }
  }
}

// =============================================================================
// WEBHOOK EVENT HELPERS
// =============================================================================

export class WebhookEventEmitter {
  constructor(private webhookService: WebhookService) {}

  async emitBlobUploaded(data: {
    blobId: string;
    filename: string;
    size: number;
    contentType: string;
    uploader?: string;
    vaultId?: string;
    cdnUrl: string;
  }): Promise<void> {
    await this.webhookService.sendWebhook('blob.uploaded', data);
  }

  async emitBlobCached(data: {
    blobId: string;
    size: number;
    ttl?: number;
    pinned: boolean;
  }): Promise<void> {
    await this.webhookService.sendWebhook('blob.cached', data);
  }

  async emitBlobEvicted(data: {
    blobId: string;
    reason: 'ttl_expired' | 'lru_eviction' | 'manual_clear';
    cacheTime: number;
  }): Promise<void> {
    await this.webhookService.sendWebhook('blob.evicted', data);
  }

  async emitBlobVerified(data: {
    blobId: string;
    chains: string[];
    overallVerified: boolean;
    consensusLevel: string;
  }): Promise<void> {
    await this.webhookService.sendWebhook('blob.verified', data);
  }

  async emitBlockchainRegistered(data: {
    blobId: string;
    chain: string;
    transactionHash: string;
    contractAddress?: string;
    uploader: string;
  }): Promise<void> {
    await this.webhookService.sendWebhook('blockchain.registered', data);
  }

  async emitAnalyticsThreshold(data: {
    metric: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'critical';
    blobId?: string;
  }): Promise<void> {
    await this.webhookService.sendWebhook('analytics.threshold', data);
  }
}