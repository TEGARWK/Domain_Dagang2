const db = require('../config/db');
const voucherService = require('../services/VoucherService');
const redisClient = require('../config/redisClient');

exports.renderVouchers = async (req, res) => {
    try {
        const query = `
            SELECT v.*, 
            (SELECT COUNT(*) FROM voucher_claims WHERE voucher_id = v.id) as total_claimed,
            (SELECT COUNT(*) FROM voucher_claims WHERE voucher_id = v.id AND status = 'used') as total_used
            FROM vouchers v
            ORDER BY v.created_at DESC
        `;
        const result = await db.pool.query(query);
        
        const vouchers = await Promise.all(result.rows.map(async (v) => {
            const redisQuota = await redisClient.getValue(`voucher:quota:${v.id}`);
            return {
                ...v,
                realtime_quota: redisQuota !== null ? parseInt(redisQuota) : (v.quota - v.quota_used)
            };
        }));

        res.render('admin/voucher_list', {
            title: 'Manajemen Voucher',
            activePage: 'vouchers',
            vouchers: vouchers
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.renderCreateVoucher = (req, res) => {
    res.render('admin/voucher_create', {
        title: 'Buat Voucher Baru',
        activePage: 'vouchers'
    });
};

exports.renderVoucherClaims = async (req, res) => {
    try {
        const { id } = req.params;
        const vRes = await db.pool.query("SELECT code FROM vouchers WHERE id = $1", [id]);
        const query = `
            SELECT vc.*, u.name as user_name, u.email as user_email
            FROM voucher_claims vc
            JOIN users u ON vc.user_id = u.id
            WHERE vc.voucher_id = $1
            ORDER BY vc.claimed_at DESC
        `;
        const result = await db.pool.query(query, [id]);
        
        res.render('admin/voucher_claims', {
            title: `Klaim Voucher: ${vRes.rows[0]?.code}`,
            activePage: 'vouchers',
            claims: result.rows
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

/**
 * ADMIN VOUCHER CONTROLLER
 * Menangani pengelolaan voucher oleh administrator.
 */

exports.createVoucher = async (req, res) => {
    try {
        const { 
            code, title, discount_type, discount_value, quota, 
            max_use_per_user, applicable_to, min_transaction,
            started_at, expired_at, max_discount, is_new_user_only, is_stackable,
            subtitle, banner_image, description, is_automatic, priority, segment,
            eligible_actions
        } = req.body;
        const adminId = req.user.id;

        // Validasi Dasar
        if (new Date(expired_at) <= new Date(started_at)) {
            return res.status(400).json({ message: "Tanggal kadaluwarsa harus setelah tanggal mulai." });
        }
        if (discount_type === 'percentage' && discount_value > 100) {
            return res.status(400).json({ message: "Diskon persentase tidak boleh lebih dari 100%." });
        }

        const query = `
            INSERT INTO vouchers (
                code, title, discount_type, discount_value, quota,
                max_use_per_user, applicable_to, min_transaction,
                started_at, expired_at, created_by,
                max_discount, is_new_user_only, is_stackable,
                subtitle, banner_image, description, is_automatic, priority, segment,
                eligible_actions
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            RETURNING *
        `;

        const result = await db.pool.query(query, [
            code.toUpperCase(), title, discount_type, discount_value, quota,
            max_use_per_user || 1, applicable_to || null, min_transaction || 0,
            started_at, expired_at, adminId,
            max_discount || 0, is_new_user_only || false, is_stackable || false,
            subtitle || null, banner_image || null, description || null, 
            is_automatic || false, priority || 0, segment || 'all',
            eligible_actions ? (typeof eligible_actions === 'string' ? eligible_actions : JSON.stringify(eligible_actions)) : '["register"]'
        ]);

        const voucher = result.rows[0];

        // Sync ke Redis
        await voucherService.initVoucherQuotaToRedis(voucher.id);

        return res.status(201).json({
            success: true,
            message: "Voucher berhasil dibuat.",
            data: voucher
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            code, title, discount_type, discount_value, quota, 
            max_use_per_user, applicable_to, min_transaction,
            started_at, expired_at, max_discount, is_new_user_only, is_stackable,
            subtitle, banner_image, description, is_automatic, priority, segment,
            is_active, eligible_actions
        } = req.body;

        const checkRes = await db.pool.query("SELECT id FROM vouchers WHERE id = $1", [id]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Voucher tidak ditemukan." });
        }

        const query = `
            UPDATE vouchers SET
                code = $1, title = $2, discount_type = $3, discount_value = $4, quota = $5,
                max_use_per_user = $6, applicable_to = $7, min_transaction = $8,
                started_at = $9, expired_at = $10, max_discount = $11, 
                is_new_user_only = $12, is_stackable = $13,
                subtitle = $14, banner_image = $15, description = $16,
                is_automatic = $17, priority = $18, segment = $19,
                is_active = $20, eligible_actions = $21, updated_at = NOW()
            WHERE id = $22
            RETURNING *
        `;

        const result = await db.pool.query(query, [
            code.toUpperCase(), title, discount_type, discount_value, quota,
            max_use_per_user || 1, applicable_to || null, min_transaction || 0,
            started_at, expired_at, max_discount || 0, 
            is_new_user_only || false, is_stackable || false,
            subtitle || null, banner_image || null, description || null,
            is_automatic || false, priority || 0, segment || 'all',
            is_active !== undefined ? is_active : true,
            eligible_actions ? (typeof eligible_actions === 'string' ? eligible_actions : JSON.stringify(eligible_actions)) : '["register"]',
            id
        ]);

        const voucher = result.rows[0];

        // Sync ulang ke Redis
        await voucherService.initVoucherQuotaToRedis(id);

        return res.status(200).json({
            success: true,
            message: "Voucher berhasil diperbarui.",
            data: voucher
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.listVouchers = async (req, res) => {
    try {
        const query = `
            SELECT v.*, 
            (SELECT COUNT(*) FROM voucher_claims WHERE voucher_id = v.id) as total_claimed,
            (SELECT COUNT(*) FROM voucher_claims WHERE voucher_id = v.id AND status = 'used') as total_used
            FROM vouchers v
            ORDER BY v.created_at DESC
        `;
        const result = await db.pool.query(query);
        
        // Ambil kuota real-time dari Redis untuk setiap voucher
        const vouchers = await Promise.all(result.rows.map(async (v) => {
            const redisQuota = await redisClient.getValue(`voucher:quota:${v.id}`);
            return {
                ...v,
                realtime_quota: redisQuota !== null ? parseInt(redisQuota) : (v.quota - v.quota_used)
            };
        }));

        return res.status(200).json({
            success: true,
            data: vouchers
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.toggleVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        await db.pool.query("UPDATE vouchers SET is_active = $1, updated_at = NOW() WHERE id = $2", [is_active, id]);
        
        if (!is_active) {
            // Jika dimatikan, set Redis quota ke 0 agar tidak bisa diklaim
            await redisClient.setWithExpiry(`voucher:quota:${id}`, "0", 86400); 
        } else {
            // Jika diaktifkan kembali, sync ulang kuota
            await voucherService.initVoucherQuotaToRedis(id);
        }

        return res.status(200).json({
            success: true,
            message: `Voucher berhasil ${is_active ? 'diaktifkan' : 'dimatikan'}.`
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getVoucherClaims = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT vc.*, u.name as user_name, u.email as user_email
            FROM voucher_claims vc
            JOIN users u ON vc.user_id = u.id
            WHERE vc.voucher_id = $1
            ORDER BY vc.claimed_at DESC
        `;
        const result = await db.pool.query(query, [id]);
        
        return res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
