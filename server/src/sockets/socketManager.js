const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/token.util');
const { SOCKET_CHANNELS } = require('../config/constants');
const logger = require('../utils/logger');
const env = require('../config/env');

let io = null;

const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        // Allow connection but tag as anonymous for public viewing
        socket.user = null;
        return next();
      }

      const decoded = verifyAccessToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      logger.warn(`Socket authentication failed: ${err.message}`);
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id} (User: ${socket.user?.email || 'Anonymous'})`);

    // Join assessment submission room
    socket.on('join:submission', (submissionId) => {
      const room = `${SOCKET_CHANNELS.SUBMISSION_ROOM_PREFIX}${submissionId}`;
      socket.join(room);
      logger.debug(`Socket ${socket.id} joined room ${room}`);
      socket.emit('joined:submission', { room, submissionId });
    });

    // Leave room
    socket.on('leave:submission', (submissionId) => {
      const room = `${SOCKET_CHANNELS.SUBMISSION_ROOM_PREFIX}${submissionId}`;
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => io;

/**
 * Emit test execution progress to connected submission room
 */
const emitTestProgress = (submissionId, payload) => {
  if (!io) return;
  const room = `${SOCKET_CHANNELS.SUBMISSION_ROOM_PREFIX}${submissionId}`;
  io.to(room).emit(SOCKET_CHANNELS.TEST_PROGRESS, payload);
};

/**
 * Emit test execution completion with score and breakdown
 */
const emitTestComplete = (submissionId, payload) => {
  if (!io) return;
  const room = `${SOCKET_CHANNELS.SUBMISSION_ROOM_PREFIX}${submissionId}`;
  io.to(room).emit(SOCKET_CHANNELS.TEST_COMPLETE, payload);
};

/**
 * Emit execution error
 */
const emitTestError = (submissionId, payload) => {
  if (!io) return;
  const room = `${SOCKET_CHANNELS.SUBMISSION_ROOM_PREFIX}${submissionId}`;
  io.to(room).emit(SOCKET_CHANNELS.TEST_ERROR, payload);
};

module.exports = {
  initSocketIO,
  getIO,
  emitTestProgress,
  emitTestComplete,
  emitTestError
};

