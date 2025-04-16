// --- Redis Client Setup ---
/**
 * Configures and exports a Redis client instance using ioredis.
 *
 * Handles connection events and ignores flush errors due to max retries.
 * Uses REDIS_URL from environment or defaults to localhost.
 */
import Redis from 'ioredis';
import MaxRetriesPerRequestError from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * The shared Redis client instance for the application.
 */
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  enableReadyCheck: true,
});

// --- Redis Error Handling ---
redis.on('error', err => {
  // ignore flush errors due to max retries
  if (err instanceof MaxRetriesPerRequestError) {
    return;
  }
  console.error('Redis error', err);
});
