const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challenge.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { ROLES } = require('../config/constants');
const { rateLimiter } = require('../middleware/rateLimiter.middleware');

// Public or Authenticated List of Challenges
router.get('/', rateLimiter(60, 60), challengeController.getAllChallenges);

// Get Specific Challenge
router.get('/:id', rateLimiter(60, 60), challengeController.getChallengeById);

// Mentor-Only Capabilities: Create, Update, Delete
router.post(
  '/',
  authenticate,
  requireRole(ROLES.MENTOR),
  rateLimiter(30, 60),
  challengeController.createChallenge
);

router.put(
  '/:id',
  authenticate,
  requireRole(ROLES.MENTOR),
  challengeController.updateChallenge
);

router.delete(
  '/:id',
  authenticate,
  requireRole(ROLES.MENTOR),
  challengeController.deleteChallenge
);

module.exports = router;

