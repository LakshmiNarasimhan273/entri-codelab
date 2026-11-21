const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/antigravity_assessment',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'antigravity_access_super_secret_jwt_key_2026_xyz',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'antigravity_refresh_super_secret_jwt_key_2026_abc',
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  MENTOR_SIGNUP_SECRET: process.env.MENTOR_SIGNUP_SECRET || 'mentor-secret-signup-99x',
  EXECUTION_DRIVER: process.env.EXECUTION_DRIVER || 'auto',
  DOCKER_IMAGE: process.env.DOCKER_IMAGE || 'antigravity-sandbox-runner:latest',
  SANDBOX_TIMEOUT_MS: parseInt(process.env.SANDBOX_TIMEOUT_MS, 10) || 10000,
  SANDBOX_MEMORY_LIMIT_MB: parseInt(process.env.SANDBOX_MEMORY_LIMIT_MB, 10) || 256,
  SANDBOX_CPU_QUOTA: parseFloat(process.env.SANDBOX_CPU_QUOTA) || 0.5,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000
};

