const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { rateLimiter } = require('../middleware/rateLimiter.middleware');

// Public Learner Registration
router.post('/register', rateLimiter(10, 60), authController.registerLearner);

// Dedicated, Unlinked, Obfuscated Mentor Invite Registration Route
router.post('/invite/:secretToken', rateLimiter(5, 60), authController.registerMentor);
router.post('/mentor-secret-signup-99x', rateLimiter(5, 60), authController.registerMentor);

// Unified Login for both Learners and Mentors
router.post('/login', rateLimiter(20, 60), authController.login);

// Refresh Access Token
router.post('/refresh', authController.refresh);

// Current User Profile
router.get('/me', authenticate, authController.getMe);

// Logout
router.post('/logout', authenticate, authController.logout);

module.exports = router;

