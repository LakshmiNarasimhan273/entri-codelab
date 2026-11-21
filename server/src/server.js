const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const env = require('./config/env');
const { connectDB } = require('./config/db');
const { getRedisClient } = require('./config/redis');
const { initSocketIO } = require('./sockets/socketManager');
const { initExecutionQueue } = require('./execution/queue');
const errorHandler = require('./middleware/errorHandler.middleware');
const logger = require('./utils/logger');

// Route Imports
const authRoutes = require('./routes/auth.routes');
const challengeRoutes = require('./routes/challenge.routes');
const submissionRoutes = require('./routes/submission.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const healthRoutes = require('./routes/health.routes');

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
const io = initSocketIO(server);

// Security & Parsing Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for demo/Monaco worker
}));

app.use(cors({
  origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    skip: (req) => req.url === '/health' || req.url === '/readiness'
  }));
}

// Mount Routes
app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/analytics', analyticsRoutes);

// Fallback 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Resource not found on Antigravity Platform: [${req.method}] ${req.originalUrl}`
  });
});

// Central Error Handler
app.use(errorHandler);

// Bootstrap & Server Start
const bootstrap = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Initialize Redis Client
    getRedisClient();

    // 3. Initialize BullMQ / Execution Worker
    initExecutionQueue();

    // 4. Start HTTP & Socket Server
    server.listen(env.PORT, () => {
      logger.info(`=======================================================`);
      logger.info(` Antigravity Assessment Platform running on port ${env.PORT}`);
      logger.info(` Environment: ${env.NODE_ENV}`);
      logger.info(` Healthcheck: http://localhost:${env.PORT}/health`);
      logger.info(`=======================================================`);
    });

  } catch (err) {
    logger.error('Failed to start Antigravity Assessment Server:', err);
    process.exit(1);
  }
};

// Graceful Shutdown Handler for Kubernetes / Docker orchestrators
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Initiating graceful zero-downtime shutdown...`);
  server.close(async () => {
    logger.info('HTTP & Socket.io connections closed.');
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        logger.info('MongoDB connections terminated.');
      }
    } catch (dbErr) {
      logger.error('Error during DB disconnect:', dbErr);
    }
    process.exit(0);
  });

  // Force close after 10s if hung
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  bootstrap();
}

module.exports = { app, server, bootstrap };
