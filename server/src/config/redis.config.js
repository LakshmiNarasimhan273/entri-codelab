const env = require('./env');

// Redis connection options for BullMQ queues and workers
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

module.exports = redisConnection;

