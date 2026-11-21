const { getSandboxDriver } = require('./driverFactory');
const circuitBreaker = require('./circuitBreaker');
const submissionRepository = require('../repositories/submission.repository');
const challengeRepository = require('../repositories/challenge.repository');
const submissionService = require('../services/submission.service');
const { emitTestProgress, emitTestComplete, emitTestError } = require('../sockets/socketManager');
const { SUBMISSION_STATUS, EXECUTION_CONTEXTS } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Core test execution job processor
 * @param {Object} job Job payload containing submissionId, challengeId, isTryMode, etc.
 */
const processExecutionJob = async (job) => {
  const {
    submissionId,
    challengeId,
    submittedCode,
    isTryMode = false,
    context = EXECUTION_CONTEXTS.LEARNER_SUBMISSION_SANDBOX
  } = job.data || job;

  logger.info(`[${context}] Starting test execution for ${submissionId}`);

  // Circuit Breaker Guard
  if (circuitBreaker.isOpen()) {
    logger.warn(`Execution rejected for [${submissionId}]: Circuit breaker OPEN`);
    if (!isTryMode) {
      await submissionRepository.update(submissionId, {
        status: SUBMISSION_STATUS.FAILED,
        'testResults.rawOutput': 'Service temporarily throttled. Sandbox worker circuit breaker is active.'
      });
    }
    emitTestError(submissionId, {
      message: 'Sandbox workers are currently cooling down due to high system load. Please retry in 30 seconds.'
    });
    return;
  }

  try {
    // 1. Fetch Challenge Details
    const challenge = await challengeRepository.findById(challengeId);
    if (!challenge) {
      throw new Error(`Challenge ${challengeId} not found`);
    }

    // 2. Mark Submission as RUNNING & Notify Client
    if (!isTryMode) {
      await submissionRepository.update(submissionId, { status: SUBMISSION_STATUS.RUNNING });
    } else {
      submissionService.setVolatileSession(submissionId, {
        id: submissionId,
        submissionId,
        challengeId,
        status: SUBMISSION_STATUS.RUNNING,
        isTryMode: true
      });
    }

    emitTestProgress(submissionId, {
      step: 'SANDBOX_PROVISIONED',
      progress: 25,
      message: `Isolating test runner environment (${context})...`
    });

    // 3. Acquire Sandbox Driver
    const driver = getSandboxDriver();

    emitTestProgress(submissionId, {
      step: 'RUNNING_TESTS',
      progress: 65,
      message: 'Executing dual-tier test suite in restricted sandbox...'
    });

    // 4. Extract sampleTests and hiddenTests
    const sampleTests = challenge.testSuites?.sampleTests?.content || challenge.testCases || '';
    const hiddenTests = challenge.testSuites?.hiddenTests?.content || '';

    // 5. Run isolated tests
    const result = await driver.execute({
      files: submittedCode,
      sampleTests,
      hiddenTests,
      testCases: sampleTests + '\n' + hiddenTests,
      isTryMode: Boolean(isTryMode),
      stack: challenge.stack,
      jobId: submissionId,
      timestamp: (job.data && job.data.timestamp) || Date.now()
    });

    // 6. Update Persistence (Volatile Memory for Try Mode vs Mongo for Learner Mode)
    if (!isTryMode) {
      await submissionRepository.update(submissionId, {
        status: SUBMISSION_STATUS.COMPLETED,
        score: result.score,
        testSummary: {
          total: result.total,
          passed: result.passed,
          failed: result.failed,
          samplePassed: result.samplePassed,
          sampleTotal: result.sampleTotal,
          hiddenPassed: result.hiddenPassed,
          hiddenTotal: result.hiddenTotal,
          details: result.suites,
          rawOutput: result.rawOutput
        },
        testResults: {
          total: result.total,
          passed: result.passed,
          failed: result.failed,
          suites: result.suites,
          rawOutput: result.rawOutput
        },
        executionTimeMs: result.executionTimeMs
      });
    } else {
      submissionService.setVolatileSession(submissionId, {
        id: submissionId,
        submissionId,
        challengeId,
        status: SUBMISSION_STATUS.COMPLETED,
        score: result.score,
        testSummary: {
          total: result.total,
          passed: result.passed,
          failed: result.failed,
          samplePassed: result.samplePassed,
          sampleTotal: result.sampleTotal,
          hiddenPassed: result.hiddenPassed,
          hiddenTotal: result.hiddenTotal,
          details: result.suites,
          rawOutput: result.rawOutput
        },
        testResults: {
          total: result.total,
          passed: result.passed,
          failed: result.failed,
          suites: result.suites,
          rawOutput: result.rawOutput
        },
        isTryMode: true,
        executionTimeMs: result.executionTimeMs
      });
    }

    // 7. Record Success in Circuit Breaker
    circuitBreaker.recordSuccess();

    // 8. Emit Real-time Completion over WebSockets
    emitTestComplete(submissionId, {
      submissionId,
      score: result.score,
      testResults: result,
      testSummary: {
        total: result.total,
        passed: result.passed,
        failed: result.failed,
        samplePassed: result.samplePassed,
        sampleTotal: result.sampleTotal,
        hiddenPassed: result.hiddenPassed,
        hiddenTotal: result.hiddenTotal,
        details: result.suites
      },
      status: SUBMISSION_STATUS.COMPLETED,
      isTryMode: Boolean(isTryMode),
      executionTimeMs: result.executionTimeMs
    });

    logger.info(`Completed execution for [${submissionId}]: Score ${result.score}% (${result.passed}/${result.total} Passed) in ${result.executionTimeMs}ms`);

    return result;

  } catch (error) {
    logger.error(`Execution failed for [${submissionId}]:`, error);
    circuitBreaker.recordFailure();

    if (!isTryMode) {
      await submissionRepository.update(submissionId, {
        status: SUBMISSION_STATUS.FAILED,
        'testResults.rawOutput': `Execution Pipeline Error: ${error.message}`
      });
    }

    emitTestError(submissionId, {
      submissionId,
      message: error.message || 'Sandbox execution runtime error.'
    });

    throw error;
  }
};

module.exports = {
  processExecutionJob
};
