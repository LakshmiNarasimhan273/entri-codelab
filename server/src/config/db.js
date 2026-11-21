const mongoose = require('mongoose');
const logger = require('../utils/logger');
const env = require('./env');

let isConnected = false;
let isInMemoryFallback = false;

// In-Memory store fallback for standalone dev/demo environments when external MongoDB is unreachable
const memoryStore = {
  users: new Map(),
  challenges: new Map(),
  submissions: new Map(),
  antiCheatLogs: []
};

const connectDB = async () => {
  if (isConnected) return;

  try {
    const options = {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 45000,
      family: 4
    };

    logger.info(`Attempting to connect to MongoDB at ${env.MONGODB_URI}...`);
    const conn = await mongoose.connect(env.MONGODB_URI, options);
    isConnected = true;
    logger.info(`MongoDB Connected successfully: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB runtime connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Reconnecting...');
      isConnected = false;
    });

  } catch (error) {
    logger.warn(`Could not connect to external MongoDB: ${error.message}`);
    logger.info('Activating High-Resilience In-Memory Mock Database for instant zero-dependency execution.');
    isInMemoryFallback = true;
    isConnected = true;
  }
};

const getDBStatus = () => ({
  connected: isConnected,
  isInMemoryFallback,
  host: isInMemoryFallback ? 'memory://virtual-cluster' : mongoose.connection.host || 'unknown'
});

module.exports = {
  connectDB,
  getDBStatus,
  memoryStore,
  isInMemoryFallback: () => isInMemoryFallback
};

