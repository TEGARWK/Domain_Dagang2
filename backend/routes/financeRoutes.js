const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { verifyAdmin } = require('../middleware/authMiddleware');

// Get Period Summary & Details
router.get('/period-data', verifyAdmin, financeController.getPeriodData);

// Save Configs (Saving & Distribution %)
router.post('/configs', verifyAdmin, financeController.saveConfigs);

// Add Mutation (Internal Cash Flow)
router.post('/mutation', verifyAdmin, financeController.addMutation);

module.exports = router;
