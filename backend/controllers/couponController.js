const CouponService = require('../services/CouponService');

exports.validateCoupon = async (req, res) => {
    try {
        const { code, amount, items, userId } = req.body;
        // Check Promo Event status (Passed from frontend or calculated here?)
        // Ideally backend knows if items have promo applied.
        // Frontend should send `hasPromoEventApplied` flag or we re-calculate.
        // For security, backend should know.
        // But `validateCoupon` is "Dry Run".
        // Let's accept `hasPromoEvent` from body for UI feedback, but Checkout Controller checks truth.
        const hasPromoEvent = req.body.hasPromoEvent || false;

        const result = await CouponService.validateCoupon(code, userId, items, amount, hasPromoEvent);
        
        if (result.valid) {
            res.json({
                valid: true,
                discount_amount: result.discountAmount,
                coupon: result.coupon
            });
        } else {
            res.status(400).json(result);
        }
    } catch (err) {
        console.error("CouponController.validate Error:", err);
        res.status(500).json({ valid: false, reason: "Server Error" });
    }
};

exports.listCoupons = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null; // From Auth Middleware
        const coupons = await CouponService.getAvailableCoupons(userId);
        res.json(coupons);
    } catch (err) {
        console.error("CouponController.list Error:", err);
        res.status(500).json({ error: "Gagal memuat kupon", details: err.message });
    }
};
