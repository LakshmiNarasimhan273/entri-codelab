const logger = require('../utils/logger');
const { sendError } = require('../utils/response.util');

const errorHandler = (err, req, res, next) => {
  logger.error(`Unhandled Exception in [${req.method}] ${req.originalUrl}:`, {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return sendError(res, 'Validation Error', 400, messages);
  }

  // Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, `A record with this ${field} already exists.`, 409);
  }

  // JSON Web Token Errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token authorization.', 401);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(res, message, statusCode);
};

module.exports = errorHandler;

