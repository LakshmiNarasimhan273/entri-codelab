const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { ROLES } = require('../config/constants');

// Mentor Only: View candidate submissions breakdown
router.get(
  '/challenge/:challengeId',
  authenticate,
  requireRole(ROLES.MENTOR),
  analyticsController.getChallengeSubmissions
);

// Mentor Only: Bulk export candidate results to Excel (.xlsx)
router.get(
  '/challenge/:challengeId/export',
  authenticate,
  requireRole(ROLES.MENTOR),
  analyticsController.exportExcel
);

module.exports = router;

