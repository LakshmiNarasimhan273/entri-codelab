const { getDBStatus } = require('../config/db');
const { isRedisConnected } = require('../config/redis');
const circuitBreaker = require('../execution/circuitBreaker');
const { sendSuccess } = require('../utils/response.util');

const getLiveness = (req, res) => {
  return sendSuccess(res, {
    status: 'UP',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  }, 'Service is live');
};

const getReadiness = (req, res) => {
  const dbStatus = getDBStatus();
  const redisOk = isRedisConnected();
  const cbStatus = circuitBreaker.getStatus();

  const isReady = dbStatus.connected && cbStatus.state !== 'OPEN';

  const payload = {
    status: isReady ? 'READY' : 'DEGRADED',
    database: dbStatus,
    redis: { connected: redisOk },
    circuitBreaker: cbStatus,
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };

  return res.status(isReady ? 200 : 503).json({
    success: isReady,
    ...payload
  });
};

module.exports = {
  getLiveness,
  getReadiness
};

