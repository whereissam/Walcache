import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { walrusService } from '../services/walrus.js';
import { cacheService } from '../services/cache.js';
import { analyticsService } from '../services/analytics.js';

const preloadSchema = z.object({
  cids: z.array(z.string().min(1)).min(1).max(100)
});

const pinSchema = z.object({
  cid: z.string().min(1)
});

interface CIDParams {
  cid: string;
}

export async function apiRoutes(fastify: FastifyInstance) {
  fastify.post('/preload', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { cids } = preloadSchema.parse(request.body);
      
      const results = await Promise.allSettled(
        cids.map(async (cid) => {
          if (!walrusService.validateCID(cid)) {
            throw new Error(`Invalid CID format: ${cid}`);
          }

          const cached = await cacheService.get(cid);
          if (cached) {
            return { cid, status: 'already_cached' };
          }

          const blob = await walrusService.fetchBlob(cid);
          if (!blob) {
            throw new Error(`Blob not found: ${cid}`);
          }

          const cachedBlob = {
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
          return { cid, status: 'cached', size: blob.size };
        })
      );

      analyticsService.recordPreload(cids);

      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map(r => ({
        error: r.reason.message
      }));

      return reply.send({
        successful,
        failed,
        total: cids.length,
        cached: successful.length,
        errors: failed.length
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Invalid request format',
          details: error.errors
        });
      }

      return reply.status(500).send({
        error: 'Internal server error'
      });
    }
  });

  fastify.get<{ Params: CIDParams }>('/stats/:cid', async (request: FastifyRequest<{ Params: CIDParams }>, reply: FastifyReply) => {
    const { cid } = request.params;

    if (!walrusService.validateCID(cid)) {
      return reply.status(400).send({ error: 'Invalid CID format' });
    }

    const stats = analyticsService.getCIDStats(cid);
    const cached = await cacheService.get(cid);
    const pinned = await cacheService.isPinned(cid);

    return reply.send({
      cid,
      stats,
      cached: !!cached,
      pinned,
      cacheDate: cached?.cached,
      ttl: cached?.ttl
    });
  });

  fastify.post<{ Params: CIDParams }>('/pin/:cid', async (request: FastifyRequest<{ Params: CIDParams }>, reply: FastifyReply) => {
    const { cid } = request.params;

    if (!walrusService.validateCID(cid)) {
      return reply.status(400).send({ error: 'Invalid CID format' });
    }

    try {
      const cached = await cacheService.get(cid);
      
      if (!cached) {
        const blob = await walrusService.fetchBlob(cid);
        if (!blob) {
          return reply.status(404).send({ error: 'Blob not found' });
        }

        const cachedBlob = {
          cid: blob.cid,
          data: blob.data,
          contentType: blob.contentType,
          size: blob.size,
          timestamp: blob.timestamp,
          cached: new Date(),
          ttl: 0,
          pinned: true
        };

        await cacheService.set(cid, cachedBlob, 0);
      }

      await cacheService.pin(cid);
      analyticsService.recordPin(cid);

      return reply.send({
        cid,
        status: 'pinned',
        cached: true
      });

    } catch (error) {
      fastify.log.error('Pin error:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.delete<{ Params: CIDParams }>('/pin/:cid', async (request: FastifyRequest<{ Params: CIDParams }>, reply: FastifyReply) => {
    const { cid } = request.params;

    if (!walrusService.validateCID(cid)) {
      return reply.status(400).send({ error: 'Invalid CID format' });
    }

    try {
      await cacheService.unpin(cid);
      analyticsService.recordUnpin(cid);

      return reply.send({
        cid,
        status: 'unpinned'
      });

    } catch (error) {
      fastify.log.error('Unpin error:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const globalStats = analyticsService.getGlobalStats();
    const cacheStats = await cacheService.getStats();
    const topCIDs = analyticsService.getTopCIDs(10);

    return reply.send({
      global: globalStats,
      cache: cacheStats,
      topCIDs
    });
  });

  fastify.get('/cache/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = await cacheService.getStats();
    return reply.send(stats);
  });

  fastify.post('/cache/clear', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await cacheService.clear();
      return reply.send({ status: 'cleared' });
    } catch (error) {
      fastify.log.error('Cache clear error:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}