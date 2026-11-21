const { getRedisClient, isRedisConnected } = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
    this.memoryCache = new Map(); // Resilient local in-memory cache
  }

  async get(key) {
    try {
      if (isRedisConnected()) {
        const client = getRedisClient();
        const cached = await client.get(key);
        if (cached) return JSON.parse(cached);
        return null;
      }

      // In-Memory cache fallback
      const item = this.memoryCache.get(key);
      if (!item) return null;
      if (item.expires && item.expires < Date.now()) {
        this.memoryCache.delete(key);
        return null;
      }
      return item.value;
    } catch (err) {
      logger.warn(`Cache GET error for key ${key}: ${err.message}`);
      return null;
    }
  }

  async set(key, value, ttlSeconds = this.defaultTTL) {
    try {
      if (isRedisConnected()) {
        const client = getRedisClient();
        await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      }

      // In-Memory cache fallback
      this.memoryCache.set(key, {
        value,
        expires: Date.now() + ttlSeconds * 1000
      });
    } catch (err) {
      logger.warn(`Cache SET error for key ${key}: ${err.message}`);
    }
  }

  async del(key) {
    try {
      // Always delete from local memory cache
      this.memoryCache.delete(key);

      if (isRedisConnected()) {
        const client = getRedisClient();
        await client.del(key);
      }
    } catch (err) {
      logger.warn(`Cache DEL error for key ${key}: ${err.message}`);
    }
  }

  async delPattern(pattern) {
    try {
      this.memoryCache.clear();

      if (isRedisConnected()) {
        const client = getRedisClient();
        if (typeof client.keys === 'function') {
          const keys = await client.keys(pattern);
          if (keys.length > 0) {
            for (const k of keys) {
              await client.del(k);
            }
          }
        }
      }
    } catch (err) {
      logger.warn(`Cache delPattern error: ${err.message}`);
    }
  }
}

module.exports = new CacheService();
