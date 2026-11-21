const { execSync } = require('child_process');
const DockerDriver = require('./dockerDriver');
const IsolatedProcessDriver = require('./isolatedProcessDriver');
const env = require('../config/env');
const logger = require('../utils/logger');

let cachedDriver = null;

const isDockerAvailable = () => {
  try {
    execSync('docker info', { stdio: 'ignore', timeout: 2000 });
    return true;
  } catch (err) {
    return false;
  }
};

const getSandboxDriver = () => {
  if (cachedDriver) return cachedDriver;

  if (env.EXECUTION_DRIVER === 'docker') {
    logger.info('Using Docker Execution Sandbox Driver (Configured)');
    cachedDriver = new DockerDriver();
  } else if (env.EXECUTION_DRIVER === 'isolated') {
    logger.info('Using Isolated Process Sandbox Driver (Configured)');
    cachedDriver = new IsolatedProcessDriver();
  } else {
    // Auto-detect
    if (isDockerAvailable()) {
      logger.info('Docker Daemon detected: Initializing Container Sandbox Runner');
      cachedDriver = new DockerDriver();
    } else {
      logger.info('Docker Daemon unavailable: Falling back to Isolated Subprocess Sandbox Runner');
      cachedDriver = new IsolatedProcessDriver();
    }
  }

  return cachedDriver;
};

module.exports = {
  getSandboxDriver
};

