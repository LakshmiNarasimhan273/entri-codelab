const { Queue, Worker } = require('bullmq');
const redisConnection = require('../config/redis.config');
const { isRedisConnected } = require('../config/redis');
const { processExecutionJob } = require('../execution/worker');
const logger = require('../utils/logger');

const QUEUE_NAME = 'test-execution-queue';

let testExecutionQueue = null;
let testExecutionWorker = null;

// Only initialize BullMQ queue and worker if Redis is genuinely connected
const initQueueIfAvailable = () => {
  if (isRedisConnected()) {
    try {
      if (!testExecutionQueue) {
        testExecutionQueue = new Queue(QUEUE_NAME, {
          connection: redisConnection,
          defaultJobOptions: {
            attempts: 2,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
            removeOnFail: false
          }
        });
      }

      if (!testExecutionWorker) {
        testExecutionWorker = new Worker(QUEUE_NAME, async (job) => {
          return processExecutionJob(job);
        }, {
          connection: redisConnection,
          concurrency: 10
        });

        testExecutionWorker.on('completed', (job) => {
          logger.debug(`BullMQ Job ${job.id} completed successfully`);
        });

        testExecutionWorker.on('failed', (job, err) => {
          logger.error(`BullMQ Job ${job.id} failed:`, err);
        });
      }
    } catch (err) {
      logger.warn(`BullMQ initialization skipped: ${err.message}. Using non-blocking async execution engine.`);
    }
  }
};

initQueueIfAvailable();

/**
 * Enqueue test execution job.
 * Guaranteed zero-hang: if Redis is not running or slow, immediately executes
 * in background worker via setImmediate without blocking or hanging.
 */
const enqueueExecution = async (payload) => {
  initQueueIfAvailable();

  // If Redis is confirmed available, try pushing to BullMQ with a strict 1.5s timeout
  if (isRedisConnected() && testExecutionQueue) {
    try {
      const addPromise = testExecutionQueue.add('RUN_JEST_TESTS', payload, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('BullMQ queue add timeout')), 1500)
      );

      const job = await Promise.race([addPromise, timeoutPromise]);
      logger.info(`[BullMQ] Enqueued job ${job.id} for submission ${payload.submissionId}`);
      return { id: job.id, mode: 'bullmq' };
    } catch (err) {
      logger.warn(`BullMQ add failed or timed out: ${err.message}. Falling back to instant async worker.`);
    }
  }

  // Instant non-blocking async worker fallback (Standard Zero-Dependency Mode)
  logger.info(`[Async Worker] Executing non-blocking test runner for submission ${payload.submissionId}`);
  setImmediate(async () => {
    try {
      await processExecutionJob({ data: payload });
    } catch (workerErr) {
      logger.error('Background worker error:', workerErr.message);
    }
  });

  return { id: `job-${payload.submissionId || Date.now()}`, mode: 'async-worker' };
};

module.exports = {
  enqueueExecution,
  testExecutionQueue,
  QUEUE_NAME
};
