const { Queue } = require('bullmq');
const redisConnection = require('../config/redis.config');
const { processExecutionJob } = require('../execution/worker');
const logger = require('../utils/logger');

let testExecutionQueue = null;
try {
  testExecutionQueue = new Queue('test-execution-queue', { connection: redisConnection });
} catch (err) {
  logger.warn('Failed to bind BullMQ test-execution-queue:', err.message);
}

const enqueueExecution = async (payload) => {
  if (testExecutionQueue) {
    try {
      return await testExecutionQueue.add('RUN_JEST_TESTS', payload, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      });
    } catch (err) {
      logger.warn(`BullMQ add failed: ${err.message}. Falling back to asynchronous execution worker.`);
    }
  }

  // Graceful fallback for environments without running Redis
  setImmediate(async () => {
    try {
      await processExecutionJob({ data: payload });
    } catch (workerErr) {
      logger.error('Background worker error:', workerErr.message);
    }
  });

  return { id: `job-${payload.submissionId || Date.now()}`, mode: 'async-fallback' };
};

module.exports = {
  enqueueExecution,
  testExecutionQueue
};

