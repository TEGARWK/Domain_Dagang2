const express = require('express');
const router = express.Router();
const tripayController = require('../controllers/tripayController');

const { verifyToken } = require('../middleware/authMiddleware');
const tripayWhitelist = require('../middleware/tripayWhitelist');

// Tripay Closed Payment Initialization
router.post('/closed/create', verifyToken, tripayController.createClosedTransaction);

// Tripay Open Payment Initialization
router.post('/open/create', verifyToken, tripayController.createOpenTransaction);

// Global Webhook for Tripay (Protected by Whitelist)
router.post('/webhook', tripayWhitelist, tripayController.handleWebhook);

// Check Transaction Status by Reference
router.get('/status/:reference', tripayController.checkStatus);

// Fetch Available Payment Channels
router.get('/channels', tripayController.getPaymentChannels);

module.exports = router;
