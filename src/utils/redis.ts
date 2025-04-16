import Redis from 'ioredis';
import MaxRetriesPerRequestError from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  enableReadyCheck: false,
});

redis.on('error', err => {
  // ignore flush errors due to max retries
  if (err instanceof MaxRetriesPerRequestError) {
    return;
  }
  console.error('Redis error', err);
});
