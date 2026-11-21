const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submission.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { ROLES } = require('../config/constants');
const { rateLimiter } = require('../middleware/rateLimiter.middleware');

// Run Tests in Sandbox (Protected, Rate-Limited to avoid worker flooding)
router.post(
  '/run-tests',
  authenticate,
  requireRole(ROLES.LEARNER, ROLES.MENTOR),
  rateLimiter(15, 60),
  submissionController.runTests
);

// Submit Final Assessment (Locks Assessment)
router.post(
  '/submit',
  authenticate,
  requireRole(ROLES.LEARNER, ROLES.MENTOR),
  rateLimiter(5, 60),
  submissionController.submitFinal
);

// Submission Status Check
router.get(
  '/status/:id',
  authenticate,
  submissionController.getStatus
);

// Learner Existing Assessment State
router.get(
  '/state/:challengeId',
  authenticate,
  submissionController.getMyAssessmentState
);

// Telemetry Anti-Cheat Event Logger
router.post(
  '/anticheat',
  authenticate,
  rateLimiter(60, 60),
  submissionController.logAntiCheat
);

module.exports = router;

