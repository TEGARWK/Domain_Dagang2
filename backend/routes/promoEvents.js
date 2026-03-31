const express = require('express');
const router = express.Router();
const promoEventController = require('../controllers/promoEventController');

// Public: Get Active Promos
router.get('/active', promoEventController.getActivePromos);

module.exports = router;
