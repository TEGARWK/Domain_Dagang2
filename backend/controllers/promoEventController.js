const PromoEventService = require('../services/PromoEventService');

exports.getActivePromos = async (req, res) => {
    try {
        const promos = await PromoEventService.getActivePromos();
        res.json(promos);
    } catch (err) {
        console.error("PromoEventController.getActivePromos Error:", err);
        res.status(500).json({ error: "Gagal memuat promo event.", details: err.message });
    }
};
