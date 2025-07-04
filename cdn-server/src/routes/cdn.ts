import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import axios from 'axios';
import { walrusService } from '../services/walrus.js';
import { cacheService } from '../services/cache.js';
import { analyticsService } from '../services/analytics.js';
import type { CachedBlob } from '../types/cache.js';

interface CDNParams {
  cid: string;
}

export async function cdnRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: CDNParams }>('/:cid', async (request: FastifyRequest<{ Params: CDNParams }>, reply: FastifyReply) => {
    const { cid } = request.params;
    const startTime = Date.now();

    // First check if it's a valid CID format
    if (!walrusService.validateCID(cid)) {
      return reply.status(400).send({ error: 'Invalid CID format' });
    }

    try {
      // Check cache first
      const cached = await cacheService.get(cid);
      
      if (cached) {
        const latency = Date.now() - startTime;
        analyticsService.recordFetch(cid, true, latency, cached.size);
        
        reply.header('Content-Type', cached.contentType);
        reply.header('Content-Length', cached.size.toString());
        reply.header('X-Cache', 'HIT');
        reply.header('X-Cache-Date', cached.cached.toISOString());
        reply.header('X-TTL', cached.ttl.toString());
        
        return reply.send(cached.data);
      }

      // If not in cache, try to fetch from Walrus
      try {
        const blob = await walrusService.fetchBlob(cid);
        
        if (blob) {
          const cachedBlob: CachedBlob = {
            cid: blob.cid,
            data: blob.data,
            contentType: blob.contentType,
            size: blob.size,
            timestamp: blob.timestamp,
            cached: new Date(),
            ttl: 3600,
            pinned: false
          };

          await cacheService.set(cid, cachedBlob);
          
          const latency = Date.now() - startTime;
          analyticsService.recordFetch(cid, false, latency, blob.size);

          reply.header('Content-Type', blob.contentType);
          reply.header('Content-Length', blob.size.toString());
          reply.header('X-Cache', 'MISS');
          reply.header('X-Fetch-Time', `${latency}ms`);
          
          return reply.send(blob.data);
        }
      } catch (walrusError) {
        fastify.log.warn('Walrus fetch failed, will try direct aggregator access:', walrusError);
      }

      // If Walrus service fails, try to use axios with relaxed SSL for better compatibility
      const aggregatorEndpoints = [
        `https://aggregator.walrus.wal.app/v1/${cid}`,
        `https://aggregator-devnet.walrus.space/v1/${cid}`,
        `https://wal-aggregator-devnet.staketab.org/v1/${cid}`
      ];

      for (const aggregatorUrl of aggregatorEndpoints) {
        try {
          fastify.log.info(`Trying aggregator: ${aggregatorUrl}`);
          
          // Use axios with custom agent for better SSL compatibility
          const axiosResponse = await axios.get(aggregatorUrl, {
            timeout: 15000,
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'WCDN/1.0'
            },
            // For HTTPS requests, we may need to configure SSL
            httpsAgent: new (await import('https')).Agent({
              rejectUnauthorized: false // This allows self-signed certificates
            })
          });
          
          if (axiosResponse.status === 200) {
            const data = Buffer.from(axiosResponse.data);
            const contentType = axiosResponse.headers['content-type'] || 'application/octet-stream';
            
            // Cache the result
            const cachedBlob: CachedBlob = {
              cid,
              data,
              contentType,
              size: data.length,
              timestamp: new Date(),
              cached: new Date(),
              ttl: 3600,
              pinned: false
            };
            
            await cacheService.set(cid, cachedBlob);
            
            const latency = Date.now() - startTime;
            analyticsService.recordFetch(cid, false, latency, data.length);
            
            reply.header('Content-Type', contentType);
            reply.header('Content-Length', data.length.toString());
            reply.header('X-Cache', 'MISS');
            reply.header('X-Fetch-Time', `${latency}ms`);
            reply.header('X-Source', `walrus-aggregator-${aggregatorUrl.split('//')[1].split('.')[0]}`);
            
            return reply.send(data);
          } else {
            fastify.log.warn(`Aggregator ${aggregatorUrl} returned ${axiosResponse.status}: ${axiosResponse.statusText}`);
          }
        } catch (aggregatorError) {
          fastify.log.warn(`Aggregator ${aggregatorUrl} failed:`, aggregatorError);
        }
      }
      
      return reply.status(404).send({ error: 'Blob not found on Walrus network' });
      
    } catch (error) {
      const latency = Date.now() - startTime;
      analyticsService.recordFetch(cid, false, latency);
      
      fastify.log.error('CDN fetch error:', error);
      
      if (error instanceof Error && 'statusCode' in error) {
        return reply.status(error.statusCode as number).send({ 
          error: error.message 
        });
      }
      
      return reply.status(500).send({ 
        error: 'Internal server error' 
      });
    }
  });

  fastify.head<{ Params: CDNParams }>('/:cid', async (request: FastifyRequest<{ Params: CDNParams }>, reply: FastifyReply) => {
    const { cid } = request.params;

    if (!walrusService.validateCID(cid)) {
      return reply.status(400).send();
    }

    try {
      const cached = await cacheService.get(cid);
      
      if (cached) {
        reply.header('Content-Type', cached.contentType);
        reply.header('Content-Length', cached.size.toString());
        reply.header('X-Cache', 'HIT');
        reply.header('X-Cache-Date', cached.cached.toISOString());
        return reply.send();
      }

      const blob = await walrusService.fetchBlob(cid);
      
      if (!blob) {
        return reply.status(404).send();
      }

      reply.header('Content-Type', blob.contentType);
      reply.header('Content-Length', blob.size.toString());
      reply.header('X-Cache', 'MISS');
      
      return reply.send();
      
    } catch (error) {
      fastify.log.error('CDN head error:', error);
      
      if (error instanceof Error && 'statusCode' in error) {
        return reply.status(error.statusCode as number).send();
      }
      
      return reply.status(500).send();
    }
  });
}