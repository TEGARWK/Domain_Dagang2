const express = require('express');
const router = express.Router();
const controller = require('../controllers/voucherController');
const { verifyToken } = require('../middleware/authMiddleware');
const { verifyAdmin } = require('../middleware/adminMiddleware');

// Public & Auto - No Auth Check (or Optional Auth)
router.get('/public', controller.getPublicVouchers);
router.get('/auto', controller.getAutoVouchers); // New Auto Promo Endpoint

// User Routes (Protected)
router.get('/available', verifyToken, controller.getAvailableVouchers);
router.get('/my-vouchers', verifyToken, controller.getMyVouchers);
router.get('/my', verifyToken, controller.getMyVouchers); 
router.post('/claim/:couponId', verifyToken, controller.claimVoucher);
router.post('/validate', verifyToken, controller.validateVoucher);

// Admin Routes
router.get('/all', verifyAdmin, controller.getAllVouchers);
router.post('/', verifyAdmin, controller.createVoucher);
router.put('/:id', verifyAdmin, controller.updateVoucher);
router.get('/analytics', verifyAdmin, controller.getAnalytics);
router.delete('/:id', verifyAdmin, controller.deleteVoucher);

module.exports = router;
