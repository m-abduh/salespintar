import Redis from 'ioredis';
import { env } from './env';

export const redisCache = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
});

export const redisBull = new Redis(env.REDIS_BULL_URL, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
});
