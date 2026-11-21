/**
 * Enterprise Structured Logger
 */
const getTimestamp = () => new Date().toISOString();

const logger = {
  info: (msg, meta = {}) => {
    console.log(`[${getTimestamp()}] [INFO] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[${getTimestamp()}] [WARN] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error: (msg, meta = {}) => {
    console.error(`[${getTimestamp()}] [ERROR] ${msg}`, meta);
  },
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${getTimestamp()}] [DEBUG] ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
    }
  }
};

module.exports = logger;

