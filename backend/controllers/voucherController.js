const voucherService = require('../services/VoucherService');
const db = require('../config/db');

/**
 * VOUCHER CONTROLLER
 * Menangani request klaim, apply, dan list voucher milik user.
 */

exports.getPublicVouchers = async (req, res) => {
    try {
        const vouchers = await voucherService.getPublicVouchers();
        return res.status(200).json(vouchers); // API calls from frontend expect raw array as response data usually
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAvailableVouchers = async (req, res) => {
    try {
        const userId = req.user.id;
        const vouchers = await voucherService.getAvailableClaimableVouchers(userId);
        return res.status(200).json(vouchers);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.claimVoucher = async (req, res) => {
    try {
        const voucherId = req.params.id; // Using id from RESTful route
        const userId = req.user.id;

        if (!voucherId) return res.status(400).json({ message: "Voucher ID is required." });

        const result = await voucherService.claimVoucher(userId, voucherId);
        
        return res.status(200).json({
            success: true,
            message: "Voucher berhasil diklaim.",
            data: result
        });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

exports.applyVoucher = async (req, res) => {
    try {
        const { voucherCode, invoiceId } = req.body;
        const userId = req.user.id;

        if (!voucherCode || !invoiceId) {
            return res.status(400).json({ message: "Voucher code and Invoice ID are required." });
        }

        // Ambil info invoice untuk dapetin subtotal
        const invRes = await db.pool.query("SELECT total FROM invoices WHERE id = $1 AND user_id = $2", [invoiceId, userId]);
        if (invRes.rows.length === 0) return res.status(404).json({ message: "Invoice tidak ditemukan." });
        
        const subtotal = invRes.rows[0].total;

        const result = await voucherService.applyVoucher(userId, voucherCode, invoiceId, subtotal);
        
        return res.status(200).json({
            success: true,
            message: "Voucher berhasil digunakan.",
            data: result
        });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

exports.getMyVouchers = async (req, res) => {
    try {
        const userId = req.user.id;
        const vouchers = await voucherService.getMyVouchers(userId);
        return res.status(200).json(vouchers);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getVoucherInfo = async (req, res) => {
    try {
        const { code } = req.params;
        const userId = req.user.id;

        const info = await voucherService.getVoucherInfo(code, userId);
        if (!info) return res.status(404).json({ message: "Voucher tidak ditemukan." });

        return res.status(200).json({
            success: true,
            data: info
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
