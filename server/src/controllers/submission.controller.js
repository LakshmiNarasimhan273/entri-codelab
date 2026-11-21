const submissionService = require('../services/submission.service');
const { sendSuccess, sendError } = require('../utils/response.util');

class SubmissionController {
  async runTests(req, res, next) {
    try {
      const { challengeId, submittedCode, timeSpentSeconds, isTryMode, context } = req.body;
      if (!challengeId || !submittedCode) {
        return sendError(res, 'challengeId and submittedCode map are required', 400);
      }

      const isMentorTry = Boolean(isTryMode || context === 'TRY_IDE_SANDBOX' || req.user.role === 'MENTOR');
      const executionContext = isMentorTry ? 'TRY_IDE_SANDBOX' : 'LEARNER_SUBMISSION_SANDBOX';

      const result = await submissionService.runTests(
        req.user.id,
        challengeId,
        submittedCode,
        timeSpentSeconds,
        isMentorTry,
        executionContext
      );

      return sendSuccess(
        res,
        result,
        isMentorTry ? 'Volatile sandbox test dispatched (TRY_IDE_SANDBOX).' : 'Test execution dispatched to distributed queue.',
        202
      );
    } catch (err) {
      next(err);
    }
  }

  async submitFinal(req, res, next) {
    try {
      const { challengeId, submittedCode, timeSpentSeconds, isTryMode } = req.body;
      if (!challengeId || !submittedCode) {
        return sendError(res, 'challengeId and submittedCode are required', 400);
      }

      const isMentorTry = Boolean(isTryMode || req.user.role === 'MENTOR');

      const result = await submissionService.submitFinalAssessment(
        req.user.id,
        challengeId,
        submittedCode,
        timeSpentSeconds,
        isMentorTry
      );

      return sendSuccess(
        res,
        result,
        'Assessment officially finalized and locked.',
        202
      );
    } catch (err) {
      next(err);
    }
  }

  async getStatus(req, res, next) {
    try {
      const submission = await submissionService.getSubmissionStatus(req.params.id);
      return sendSuccess(res, submission, 'Submission status fetched');
    } catch (err) {
      next(err);
    }
  }

  async getMyAssessmentState(req, res, next) {
    try {
      const submission = await submissionService.getLearnerAssessmentState(req.user.id, req.params.challengeId);
      return sendSuccess(res, submission, 'Learner current state fetched');
    } catch (err) {
      next(err);
    }
  }

  async logAntiCheat(req, res, next) {
    try {
      const { challengeId, eventType, details } = req.body;
      if (!challengeId || !eventType) {
        return sendError(res, 'challengeId and eventType are required', 400);
      }

      const result = await submissionService.recordAntiCheatEvent(
        req.user.id,
        challengeId,
        eventType,
        details
      );

      return sendSuccess(res, result, 'Anti-cheat telemetry recorded');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SubmissionController();

