const { getRedisClient } = require('../config/redis');
const { sendError } = require('../utils/response.util');
const logger = require('../utils/logger');

/**
 * High-concurrency Redis sliding window rate limiter
 * @param {number} maxRequests Maximum requests allowed within window
 * @param {number} windowSeconds Window duration in seconds
 */
const rateLimiter = (maxRequests = 60, windowSeconds = 60) => {
  return async (req, res, next) => {
    try {
      const client = getRedisClient();
      const identifier = req.user ? req.user.id : (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip');
      const key = `ratelimit:${req.baseUrl}${req.path}:${identifier}`;

      const current = await client.incr(key);
      if (current === 1) {
        await client.expire(key, windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

      if (current > maxRequests) {
        logger.warn(`Rate limit exceeded for ${key} [${current}/${maxRequests}]`);
        return sendError(
          res,
          'Too many requests sent to assessment platform. Please slow down.',
          429,
          { retryAfterSeconds: windowSeconds }
        );
      }

      next();
    } catch (err) {
      // In case of rate limiter errors, fail open to prevent blocking critical operations
      logger.error('Rate limiter encountered error:', err.message);
      next();
    }
  };
};

module.exports = {
  rateLimiter
};

