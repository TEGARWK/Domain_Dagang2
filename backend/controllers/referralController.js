const referralService = require('../services/referralService');
const db = require('../config/db');

/**
 * REFERRAL CONTROLLER
 * Menangani request dashboard referral, pengambilan kode, dan riwayat.
 */

exports.getMyStats = async (req, res) => {
    try {
        const userId = req.user.id;
        if (req.user.role === 'admin') {
            return res.status(403).json({ success: false, message: "Admin tidak diperbolehkan berpartisipasi dalam program referral." });
        }
        const stats = await referralService.getReferralStats(userId);
        
        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMyCode = async (req, res) => {
    try {
        const userId = req.user.id;
        if (req.user.role === 'admin') {
            return res.status(403).json({ success: false, message: "Admin tidak diperbolehkan berpartisipasi dalam program referral." });
        }
        
        let userRes = await db.pool.query("SELECT referral_code FROM users WHERE id = $1", [userId]);
        let code = userRes.rows[0]?.referral_code;

        if (!code) {
            const userFull = await db.pool.query("SELECT name FROM users WHERE id = $1", [userId]);
            const userName = userFull.rows[0]?.name || "User";
            code = await referralService.generateReferralCode(userId, userName);
        }

        const referralLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/?ref=${code}`;

        return res.status(200).json({
            success: true,
            data: {
                referral_code: code,
                referral_link: referralLink
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getReferralHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        if (req.user.role === 'admin') {
            return res.status(403).json({ success: false, message: "Admin tidak diperbolehkan berpartisipasi dalam program referral." });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const query = `
            SELECT rr.*, u.name as referee_name
            FROM referral_rewards rr
            JOIN users u ON rr.referee_id = u.id
            WHERE rr.referrer_id = $1
            ORDER BY rr.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.pool.query(query, [userId, limit, offset]);
        
        const history = result.rows.map(h => {
            const name = h.referee_name || 'User Member';
            const parts = name.split(' ');
            const firstName = parts[0] || 'User';
            const masked = firstName.substring(0, 2) + '**' + (firstName.length > 4 ? firstName.substring(firstName.length - 1) : '');
            return { ...h, referee_name_masked: masked };
        });

        return res.status(200).json({
            success: true,
            data: history,
            page,
            limit
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateMyCode = async (req, res) => {
    try {
        const userId = req.user.id;
        if (req.user.role === 'admin') {
            return res.status(403).json({ success: false, message: "Admin tidak diperbolehkan berpartisipasi dalam program referral." });
        }
        const { newCode } = req.body;

        if (!newCode) {
            return res.status(400).json({ success: false, message: "Kode baru wajib diisi." });
        }

        const result = await referralService.updateReferralCode(userId, newCode);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.checkEligibility = async (req, res) => {
    try {
        const userId = req.user.id;
        const query = "SELECT referred_by_id, referee_discount_used FROM users WHERE id = $1";
        const result = await db.pool.query(query, [userId]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ success: false, message: "User tidak ditemukan." });
        }

        // Jika dia hasil referral (referred_by_id ada) DAN belum pake diskon
        const isEligible = !!user.referred_by_id && !user.referee_discount_used;

        return res.status(200).json({
            success: true,
            eligible: isEligible
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
