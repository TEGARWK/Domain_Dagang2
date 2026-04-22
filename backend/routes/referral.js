const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/my-stats', referralController.getMyStats);
router.get('/my-code', referralController.getMyCode);
router.get('/history', referralController.getReferralHistory);
router.post('/update-code', referralController.updateMyCode);

module.exports = router;
