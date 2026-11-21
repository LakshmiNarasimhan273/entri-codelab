const { v4: uuidv4 } = require('uuid');
const submissionRepository = require('../repositories/submission.repository');
const anticheatRepository = require('../repositories/anticheat.repository');
const challengeRepository = require('../repositories/challenge.repository');
const { enqueueExecution } = require('./executionQueue.service');
const { SUBMISSION_STATUS, ANTI_CHEAT_EVENTS, EXECUTION_CONTEXTS } = require('../config/constants');
const logger = require('../utils/logger');

const VIOLATION_FLAG_THRESHOLD = 5;

// Volatile in-memory sessions for Mentor "Try IDE" runs to completely prevent DB pollution
const volatileSessions = new Map();

class SubmissionService {
  getVolatileSession(id) {
    return volatileSessions.get(String(id));
  }

  setVolatileSession(id, data) {
    volatileSessions.set(String(id), data);
  }

  async runTests(learnerId, challengeId, submittedCode, timeSpentSeconds = 0, isTryMode = false, context = EXECUTION_CONTEXTS.LEARNER_SUBMISSION_SANDBOX) {
    const challenge = await challengeRepository.findById(challengeId);
    if (!challenge) {
      const error = new Error('Challenge not found');
      error.statusCode = 404;
      throw error;
    }

    // 1. MENTOR PREVIEW MODE: STRICT VOLATILE ISOLATION (No DB Write)
    if (isTryMode || context === EXECUTION_CONTEXTS.TRY_IDE_SANDBOX) {
      const volatileId = `try_ide_${uuidv4()}`;
      logger.info(`[TRY_IDE_SANDBOX] Initializing volatile execution session [${volatileId}] without database persistence.`);

      volatileSessions.set(volatileId, {
        id: volatileId,
        submissionId: volatileId,
        challengeId: String(challengeId),
        learnerId: String(learnerId),
        submittedCode,
        status: SUBMISSION_STATUS.RUNNING,
        isTryMode: true,
        context: EXECUTION_CONTEXTS.TRY_IDE_SANDBOX,
        createdAt: new Date()
      });

      if (typeof enqueueExecution !== 'function') {
        throw new TypeError('enqueueExecution is not a function');
      }

      const queueInfo = await enqueueExecution({
        submissionId: volatileId,
        challengeId: String(challengeId),
        learnerId: String(learnerId),
        submittedCode,
        isTryMode: true,
        context: EXECUTION_CONTEXTS.TRY_IDE_SANDBOX,
        timestamp: Date.now(),
        nonce: `${Date.now()}_${Math.random()}`
      });

      return {
        submissionId: volatileId,
        status: SUBMISSION_STATUS.RUNNING,
        isTryMode: true,
        context: EXECUTION_CONTEXTS.TRY_IDE_SANDBOX,
        queueInfo
      };
    }

    // 2. LEARNER ASSESSMENT MODE: PERMANENT SUBMISSION STORAGE
    const existing = await submissionRepository.findByUserAndChallenge(learnerId, challengeId);
    if (existing && existing.isFinalSubmission) {
      const error = new Error('Assessment already submitted and finalized. Further modifications are locked.');
      error.statusCode = 403;
      throw error;
    }

    let submission;
    if (existing) {
      submission = await submissionRepository.update(existing.id || existing._id, {
        submittedCode,
        status: SUBMISSION_STATUS.RUNNING,
        timeSpentSeconds
      });
    } else {
      submission = await submissionRepository.create({
        challengeId,
        learnerId,
        submittedCode,
        status: SUBMISSION_STATUS.RUNNING,
        timeSpentSeconds
      });
    }

    const submissionId = submission.id || submission._id;

    if (typeof enqueueExecution !== 'function') {
      throw new TypeError('enqueueExecution is not a function');
    }

    // Enqueue non-blocking job
    const queueInfo = await enqueueExecution({
      submissionId: String(submissionId),
      challengeId: String(challengeId),
      learnerId: String(learnerId),
      submittedCode,
      isTryMode: false,
      context: EXECUTION_CONTEXTS.LEARNER_SUBMISSION_SANDBOX,
      timestamp: Date.now(),
      nonce: `${Date.now()}_${Math.random()}`
    });

    return {
      submissionId,
      status: SUBMISSION_STATUS.RUNNING,
      isTryMode: false,
      context: EXECUTION_CONTEXTS.LEARNER_SUBMISSION_SANDBOX,
      queueInfo
    };
  }

  async submitFinal(learnerId, challengeId, submittedCode, timeSpentSeconds = 0, isTryMode = false) {
    return this.submitFinalAssessment(learnerId, challengeId, submittedCode, timeSpentSeconds, isTryMode);
  }

  async submitFinalAssessment(learnerId, challengeId, submittedCode, timeSpentSeconds = 0, isTryMode = false) {
    if (isTryMode) {
      return this.runTests(learnerId, challengeId, submittedCode, timeSpentSeconds, true, EXECUTION_CONTEXTS.TRY_IDE_SANDBOX);
    }

    const existing = await submissionRepository.findByUserAndChallenge(learnerId, challengeId);
    if (existing && existing.isFinalSubmission) {
      const error = new Error('Assessment has already been submitted and locked.');
      error.statusCode = 400;
      throw error;
    }

    let submission;
    if (existing) {
      submission = await submissionRepository.update(existing.id || existing._id, {
        submittedCode,
        isFinalSubmission: true,
        status: SUBMISSION_STATUS.RUNNING,
        timeSpentSeconds
      });
    } else {
      submission = await submissionRepository.create({
        challengeId,
        learnerId,
        submittedCode,
        isFinalSubmission: true,
        status: SUBMISSION_STATUS.RUNNING,
        timeSpentSeconds
      });
    }

    const submissionId = submission.id || submission._id;

    if (typeof enqueueExecution !== 'function') {
      throw new TypeError('enqueueExecution is not a function');
    }

    // Trigger final test run & evaluation
    await enqueueExecution({
      submissionId: String(submissionId),
      challengeId: String(challengeId),
      learnerId: String(learnerId),
      submittedCode,
      isTryMode: false,
      isFinalSubmission: true,
      context: EXECUTION_CONTEXTS.LEARNER_SUBMISSION_SANDBOX,
      timestamp: Date.now(),
      nonce: `${Date.now()}_${Math.random()}`
    });

    return {
      submissionId,
      isFinalSubmission: true,
      status: SUBMISSION_STATUS.RUNNING,
      message: 'Assessment finalized and submitted for official evaluation.'
    };
  }

  async getSubmissionStatus(submissionId) {
    if (String(submissionId).startsWith('try_ide_')) {
      const volatile = volatileSessions.get(String(submissionId));
      if (volatile) return volatile;
      return { status: SUBMISSION_STATUS.COMPLETED, isTryMode: true };
    }

    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      const error = new Error('Submission record not found');
      error.statusCode = 404;
      throw error;
    }
    return submission;
  }

  async getLearnerAssessmentState(learnerId, challengeId) {
    return submissionRepository.findByUserAndChallenge(learnerId, challengeId);
  }

  async recordAntiCheatEvent(learnerId, challengeId, eventType, details = {}) {
    // 1. Audit log in telemetry store
    await anticheatRepository.logEvent({
      challengeId,
      learnerId,
      eventType,
      details,
      clientTimestamp: new Date()
    });

    // 2. Update Submission antiCheat counters
    const submission = await submissionRepository.findByUserAndChallenge(learnerId, challengeId);
    if (submission) {
      const summary = { ...(submission.antiCheatSummary || {}) };
      summary.totalViolations = (summary.totalViolations || 0) + 1;

      switch (eventType) {
        case ANTI_CHEAT_EVENTS.COPY_ATTEMPT:
          summary.copyCount = (summary.copyCount || 0) + 1;
          break;
        case ANTI_CHEAT_EVENTS.PASTE_ATTEMPT:
          summary.pasteCount = (summary.pasteCount || 0) + 1;
          break;
        case ANTI_CHEAT_EVENTS.TAB_SWITCH:
          summary.tabSwitchCount = (summary.tabSwitchCount || 0) + 1;
          break;
        case ANTI_CHEAT_EVENTS.WINDOW_BLUR:
          summary.blurCount = (summary.blurCount || 0) + 1;
          break;
        case ANTI_CHEAT_EVENTS.FULLSCREEN_EXIT:
          summary.fullscreenExitCount = (summary.fullscreenExitCount || 0) + 1;
          break;
      }

      if (summary.totalViolations >= VIOLATION_FLAG_THRESHOLD) {
        summary.isFlagged = true;
      }

      await submissionRepository.update(submission.id || submission._id, {
        antiCheatSummary: summary
      });

      return { summary, flagged: summary.isFlagged };
    }

    return { logged: true };
  }
}

module.exports = new SubmissionService();
