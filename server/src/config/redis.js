const Redis = require('ioredis');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const env = require('./env');

let redisClient = null;
let isRedisAvailable = false;

// In-Memory mock client fallback if external Redis is unreachable
class MockRedisClient extends EventEmitter {
  constructor() {
    super();
    this.store = new Map();
    this.status = 'ready';
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expires && item.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, mode, duration) {
    let expires = null;
    if (mode === 'EX' && duration) {
      expires = Date.now() + duration * 1000;
    } else if (mode === 'PX' && duration) {
      expires = Date.now() + duration;
    }
    this.store.set(key, { value: String(value), expires });
    return 'OK';
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }

  async incr(key) {
    const item = await this.get(key);
    const count = item ? parseInt(item, 10) + 1 : 1;
    this.store.set(key, { value: String(count), expires: null });
    return count;
  }

  async expire(key, seconds) {
    const item = this.store.get(key);
    if (item) {
      item.expires = Date.now() + seconds * 1000;
      return 1;
    }
    return 0;
  }

  async ping() {
    return 'PONG';
  }

  duplicate() {
    return new MockRedisClient();
  }
}

const getRedisClient = () => {
  if (redisClient) return redisClient;

  try {
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn(`Redis connection failed after ${times} attempts. Switching to memory cache.`);
          return null; // Stop retrying
        }
        return Math.min(times * 100, 2000);
      },
      connectTimeout: 2000
    });

    client.on('connect', () => {
      isRedisAvailable = true;
      logger.info('Connected to Redis cluster successfully.');
    });

    client.on('error', (err) => {
      if (!isRedisAvailable) {
        logger.warn(`Redis not reachable (${err.message}). Using high-performance in-memory fallback.`);
        redisClient = new MockRedisClient();
        isRedisAvailable = false;
      }
    });

    client.on('close', () => {
      if (!isRedisAvailable) {
        redisClient = new MockRedisClient();
      }
    });

    redisClient = client;
    return redisClient;
  } catch (err) {
    logger.warn(`Unable to initialize Redis client: ${err.message}. Using in-memory fallback.`);
    redisClient = new MockRedisClient();
    isRedisAvailable = false;
    return redisClient;
  }
};

const isRedisConnected = () => isRedisAvailable;

module.exports = {
  getRedisClient,
  isRedisConnected,
  MockRedisClient
};
