const express = require('express');
const router = express.Router();
const { getLiveness, getReadiness } = require('../controllers/health.controller');

router.get('/health', getLiveness);
router.get('/readiness', getReadiness);

module.exports = router;

