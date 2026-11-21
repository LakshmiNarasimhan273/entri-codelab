const { Queue, Worker } = require('bullmq');
const { getRedisClient, isRedisConnected } = require('../config/redis');
const { processExecutionJob } = require('./worker');
const logger = require('../utils/logger');
const env = require('../config/env');

const QUEUE_NAME = 'antigravity-code-execution';

let executionQueue = null;
let bullWorker = null;

const initExecutionQueue = () => {
  const redis = getRedisClient();

  if (isRedisConnected()) {
    try {
      logger.info(`Initializing BullMQ Queue [${QUEUE_NAME}] backed by Redis cluster`);

      executionQueue = new Queue(QUEUE_NAME, {
        connection: redis,
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 1000
          },
          removeOnComplete: true,
          removeOnFail: false
        }
      });

      bullWorker = new Worker(QUEUE_NAME, async (job) => {
        return processExecutionJob(job);
      }, {
        connection: redis,
        concurrency: 10 // Max concurrent worker executions
      });

      bullWorker.on('completed', (job) => {
        logger.debug(`BullMQ Job ${job.id} completed successfully`);
      });

      bullWorker.on('failed', (job, err) => {
        logger.error(`BullMQ Job ${job.id} failed:`, err);
      });

      logger.info('BullMQ Queue and Worker initialized successfully.');
      return;
    } catch (err) {
      logger.warn(`Failed to bind BullMQ to Redis: ${err.message}. Initializing async in-memory queue.`);
    }
  }

  logger.info('Running with high-throughput Async Background Execution Queue (Non-blocking).');
};

/**
 * Offload test runner execution to BullMQ / Async Queue
 * The main Express API thread returns immediately without blocking.
 */
const enqueueExecution = async (payload) => {
  if (executionQueue && isRedisConnected()) {
    logger.info(`Pushing execution job to BullMQ queue: submission ${payload.submissionId}`);
    const job = await executionQueue.add('execute-jest-suite', payload);
    return { jobId: job.id, mode: 'bullmq' };
  }

  // Non-blocking asynchronous detachment
  logger.info(`Enqueueing non-blocking background task for submission ${payload.submissionId}`);
  setImmediate(async () => {
    try {
      await processExecutionJob({ data: payload });
    } catch (err) {
      logger.error('Background execution job error:', err.message);
    }
  });

  return { jobId: `async-${payload.submissionId}`, mode: 'async-worker' };
};

module.exports = {
  initExecutionQueue,
  enqueueExecution,
  QUEUE_NAME
};

