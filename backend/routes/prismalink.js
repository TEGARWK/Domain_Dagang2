const express = require('express');
const router = express.Router();
const PrismaLinkController = require('../controllers/prismaLinkController');
const authMiddleware = require('../middleware/authMiddleware');

// Endpoint Webhook untuk Prismalink (Public)
router.post('/webhook', (req, res) => PrismaLinkController.handleWebhook(req, res));

// Endpoint Inisialisasi Pembayaran (Protected)
router.post('/initialize', authMiddleware.verifyToken, (req, res) => {
    console.log('📍 [ROUTE DEBUG] Hit /api/prismalink/initialize');
    return PrismaLinkController.initializePayment(req, res);
});

// Endpoint Cek Status (Polling Frontend)
router.get('/status/:id', authMiddleware.verifyToken, (req, res) => PrismaLinkController.checkStatus(req, res));

module.exports = router;
