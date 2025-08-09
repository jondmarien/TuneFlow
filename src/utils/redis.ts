// --- Redis Client Setup ---
/**
 * Configures and exports a Redis client instance using ioredis.
 *
 * Handles connection events and ignores flush errors due to max retries.
 * Uses REDIS_URL from environment or defaults to localhost.
 */
import Redis from 'ioredis';
import MaxRetriesPerRequestError from 'ioredis';

let redisInstance: Redis | null = null;

/**
 * Get or create the Redis client instance.
 * Returns null during build time to prevent connection errors.
 */
export function getRedis(): Redis | null {
  // Don't create Redis connection during build time
  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    return null;
  }

  if (!redisInstance) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      redisInstance = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: true,
        enableReadyCheck: true,
        lazyConnect: true, // Don't connect immediately
      });

      // --- Redis Error Handling ---
      redisInstance.on('error', err => {
        // ignore flush errors due to max retries
        if (err instanceof MaxRetriesPerRequestError) {
          return;
        }
        console.error('Redis error', err);
      });
    } catch (error) {
      console.warn('Failed to create Redis client:', error);
      return null;
    }
  }

  return redisInstance;
}

/**
 * Legacy export for backward compatibility.
 * Use getRedis() instead for better error handling.
 */
export const redis = getRedis();
