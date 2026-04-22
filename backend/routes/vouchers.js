const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const { verifyToken } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// Public Route (Tanpa Login)
router.get('/public', voucherController.getPublicVouchers);

// Semua route di bawah butuh login
router.use(verifyToken);

// Available Vouchers untuk User tertentu
router.get('/available', voucherController.getAvailableVouchers);

// Claim Voucher (dengan Rate Limiting: 3 req / 10 sec)
router.post('/claim/:id', rateLimiter({ maxRequests: 3, windowSeconds: 10, keyPrefix: 'ratelimit:claim' }), voucherController.claimVoucher);

// Apply Voucher ke Invoice
router.post('/apply', voucherController.applyVoucher);

// List Voucher milik user
router.get('/my-vouchers', voucherController.getMyVouchers);

// Info detail voucher
router.get('/info/:code', voucherController.getVoucherInfo);

module.exports = router;
