import { Queue, Worker, QueueEvents } from 'bullmq';
import { redisBull } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const aiReplyQueue = new Queue('ai-reply', {
  connection: redisBull,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const aiTaggingQueue = new Queue('ai-tagging', {
  connection: redisBull,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const waSendQueue = new Queue('wa-send', {
  connection: redisBull,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const broadcastQueue = new Queue('broadcast', {
  connection: redisBull,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: 10,
    removeOnFail: 10,
  },
});

export const aiReplyQueueEvents = new QueueEvents('ai-reply', { connection: redisBull });
export const broadcastQueueEvents = new QueueEvents('broadcast', { connection: redisBull });

export async function setupWorkers() {
  const { handleAiReply } = await import('./ai-reply.worker');
  const { handleBroadcast } = await import('./broadcast.worker');
  const { handleAiTagging } = await import('./tagging.worker');
  const { handleWaSend } = await import('./wa-send.worker');

  new Worker('ai-reply', handleAiReply, {
    connection: redisBull,
    concurrency: 5,
  });

  new Worker('ai-tagging', handleAiTagging, {
    connection: redisBull,
    concurrency: 2,
  });

  new Worker('wa-send', handleWaSend, {
    connection: redisBull,
    concurrency: 3,
  });

  new Worker('broadcast', handleBroadcast, {
    connection: redisBull,
    concurrency: 1,
  });

  logger.info('BullMQ workers initialized');
}

export async function closeQueues() {
  await aiReplyQueue.close();
  await aiTaggingQueue.close();
  await waSendQueue.close();
  await broadcastQueue.close();
}
