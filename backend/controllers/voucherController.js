const VoucherService = require('../services/VoucherService');
const { createLog } = require("./auditController");

// 1. GET AVAILABLE CLAIMABLE VOUCHERS (Protected)
exports.getAvailableVouchers = async (req, res) => {
    try {
        const userId = req.user.id;
        const vouchers = await VoucherService.getAvailableClaimableVouchers(userId);
        res.json(vouchers);
    } catch (err) {
        console.error("Fetch Available Error:", err);
        res.status(500).json({ error: "Gagal mengambil daftar voucher.", details: err.message });
    }
};

// 1b. GET PUBLIC VOUCHERS (For Discovery/All - Public)
exports.getPublicVouchers = async (req, res) => {
    try {
        const vouchers = await VoucherService.getPublicVouchers();
        res.json(vouchers);
    } catch (err) {
        console.error("Fetch Public Error:", err);
        res.status(500).json("Gagal mengambil daftar voucher publik.");
    }
};

// 2. GET MY VOUCHERS (Claimed - Protected)
exports.getMyVouchers = async (req, res) => {
    try {
        const userId = req.user.id;
        const vouchers = await VoucherService.getMyVouchers(userId);
        res.json(vouchers);
    } catch (err) {
        console.error("Fetch My Vouchers Error:", err);
        res.status(500).json({ error: "Gagal mengambil koleksi voucher Anda.", details: err.message });
    }
};

// 3. CLAIM VOUCHER (Protected)
exports.claimVoucher = async (req, res) => {
    try {
        const userId = req.user.id;
        const { couponId } = req.params; // or req.body depending on route, route says /claim/:couponId
        
        const result = await VoucherService.claimVoucher(userId, couponId);
        res.json(result);
    } catch (err) {
        console.error("Claim Controller Error:", err.message);
        res.status(400).json(err.message || "Gagal mengklaim voucher.");
    }
};

// 4. VALIDATE VOUCHER / CALCULATE BEST DISOCUNT (Protected)
exports.validateVoucher = async (req, res) => {
    try {
        const userId = req.user.id;
        const { userVoucherId, amount, items } = req.body;
        // Map frontend expected format to service format
        // Service expects { userId, subtotal, items, userVoucherId }
        
        const result = await VoucherService.calculateBestDiscount({
            userId, 
            subtotal: amount || 0, // Frontend usually sends 'amount' or 'subtotal'
            items: items || [], 
            userVoucherId
        });

        // Map service result back to frontend expected format if needed
        // Service returns { autoDiscount, manualDiscount, totalDiscount, ... }
        // Frontend likely expects { valid: true, discount_amount: ... } for legacy compatibility
        // But if Frontend is updated to use new format, better.
        // Task 4 says "backend return best discount".
        // Let's return the full object.
        res.json({
            valid: true,
            discount_amount: result.totalDiscount,
            final_amount: (amount || 0) - result.totalDiscount,
            details: result
        });
    } catch (err) {
        console.error("Validation Controller Error:", err.message);
        res.status(400).json(err.message || "Voucher tidak valid.");
    }
};

// 5. GET AUTO VOUCHERS (New Endpoint for Task 5)
exports.getAutoVouchers = async (req, res) => {
    try {
        const { subtotal } = req.query; // Or POST body
        // If GET, items might be hard to pass. Maybe simplified check?
        // Or assume items=[] and check basic eligibility?
        // Task 5: GET /api/vouchers/auto -> ambil auto event
        // "Auto Apply: Saat load halaman -> call API -> backend return best discount"
        // If it's just getting list of auto events:
        
        const vouchers = await VoucherService.getAvailableAutoVouchers(subtotal || 9999999999, []);
        res.json(vouchers);
    } catch (err) {
        console.error("Fetch Auto Vouchers Error:", err);
        res.status(500).json("Gagal.");
    }
};

// 6. ADMIN: GET ALL VOUCHERS
exports.getAllVouchers = async (req, res) => {
    try {
        const vouchers = await VoucherService.getAllVouchers();
        res.json(vouchers);
    } catch (err) {
        console.error("Admin Fetch All Error:", err);
        res.status(500).json("Gagal mengambil data.");
    }
};

// 7. ADMIN: CREATE VOUCHER
exports.createVoucher = async (req, res) => {
    try {
        const data = req.body;
        // Basic validation
        if (!data.title) return res.status(400).json("Judul wajib diisi.");
        
        // Auto-generate code if missing (Task 3 requirement)
        if (!data.code) {
            data.code = `PRM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        }

        const voucher = await VoucherService.createVoucher(data);

        // Audit Log
        await createLog({
            user_id: req.user.id,
            action: 'CREATE_VOUCHER',
            entity_type: 'voucher',
            entity_id: voucher.id,
            new_value: voucher,
            req
        });

        res.json(voucher);
    } catch (err) {
         console.error("Admin Create Error:", err);
        res.status(500).json(err.message || "Gagal membuat voucher.");
    }
};

// 8. ADMIN: UPDATE VOUCHER
exports.updateVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const voucher = await VoucherService.updateVoucher(id, data);

        // Audit Log
        await createLog({
            user_id: req.user.id,
            action: 'UPDATE_VOUCHER',
            entity_type: 'voucher',
            entity_id: id,
            new_value: voucher,
            req
        });

        res.json(voucher);
    } catch (err) {
        console.error("Admin Update Error:", err);
        res.status(500).json(err.message || "Gagal memperbarui voucher.");
    }
};

// 9. ADMIN: DELETE VOUCHER
exports.deleteVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        await VoucherService.deleteVoucher(id);

        // Audit Log
        await createLog({
            user_id: req.user.id,
            action: 'DELETE_VOUCHER',
            entity_type: 'voucher',
            entity_id: id,
            req
        });

        res.json({ success: true });
    } catch (err) {
         console.error("Admin Delete Error:", err);
        res.status(500).json("Gagal menghapus voucher.");
    }
};
// 10. ADMIN: GET ANALYTICS
exports.getAnalytics = async (req, res) => {
    try {
        const data = await VoucherService.getAnalytics();
        res.json(data);
    } catch (err) {
        console.error("Analytics Error:", err);
        res.status(500).json("Gagal memuat analitik.");
    }
};
