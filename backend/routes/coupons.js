const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public/Protected
router.post('/validate', couponController.validateCoupon);
router.get('/', verifyToken, couponController.listCoupons); // Require login to list specific available coupons

module.exports = router;
