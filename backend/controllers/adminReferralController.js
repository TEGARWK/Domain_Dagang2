const db = require('../config/db');
const referralService = require('../services/referralService');

exports.renderReferralStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_rewards,
                SUM(CASE WHEN status = 'active' THEN reward_amount ELSE 0 END) as total_paid_out,
                SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END) as total_pending
            FROM referral_rewards
        `;
        const topReferrersQuery = `
            SELECT u.id, u.name, u.email, u.referral_code, 
            COUNT(rr.id) as success_referrals, SUM(rr.reward_amount) as total_earned,
            (SELECT tier_name FROM referral_tiers WHERE min_referrals <= COUNT(rr.id) ORDER BY min_referrals DESC LIMIT 1) as tier
            FROM referral_rewards rr
            JOIN users u ON rr.referrer_id = u.id
            WHERE rr.status = 'active'
            GROUP BY u.id
            ORDER BY success_referrals DESC
            LIMIT 10
        `;

        const stats = await db.pool.query(statsQuery);
        const top = await db.pool.query(topReferrersQuery);

        const bannedRes = await db.pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'banned_referral_codes'");
        const bannedWords = bannedRes.rows.length > 0 
            ? (typeof bannedRes.rows[0].setting_value === 'string' ? JSON.parse(bannedRes.rows[0].setting_value) : bannedRes.rows[0].setting_value)
            : [];

        res.render('admin/referral_stats', {
            title: 'Sistem Referral',
            activePage: 'referral',
            overview: stats.rows[0],
            topReferrers: top.rows,
            bannedWords
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.renderReferralRewards = async (req, res) => {
    try {
        const query = `
            SELECT rr.*, u1.name as referrer_name, u2.name as referee_name, i.total as invoice_total
            FROM referral_rewards rr
            JOIN users u1 ON rr.referrer_id = u1.id
            JOIN users u2 ON rr.referee_id = u2.id
            JOIN invoices i ON rr.invoice_id = i.id
            ORDER BY rr.created_at DESC
        `;
        const result = await db.pool.query(query);

        res.render('admin/referral_rewards', {
            title: 'Daftar Reward Referral',
            activePage: 'referral',
            rewards: result.rows
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.renderReferralTiers = async (req, res) => {
    try {
        const tiers = await db.pool.query("SELECT * FROM referral_tiers ORDER BY min_referrals ASC");
        res.render('admin/referral_tiers', {
            title: 'Pengaturan Tier Referral',
            activePage: 'referral',
            tiers: tiers.rows
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

/**
 * ADMIN REFERRAL CONTROLLER
 * Monitoring global sistem referral dan manajemen tier.
 */

exports.getGlobalStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_rewards,
                COALESCE(SUM(CASE WHEN status = 'active' THEN reward_amount ELSE 0 END), 0) as total_paid_out,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END), 0) as total_pending
            FROM referral_rewards
        `;
        const topReferrersQuery = `
            SELECT u.id, u.name, u.email, COUNT(rr.id) as success_referrals, COALESCE(SUM(rr.reward_amount), 0) as total_earned
            FROM referral_rewards rr
            JOIN users u ON rr.referrer_id = u.id
            WHERE rr.status = 'active'
            GROUP BY u.id
            ORDER BY success_referrals DESC
            LIMIT 10
        `;

        const stats = await db.pool.query(statsQuery);
        const top = await db.pool.query(topReferrersQuery);

        return res.status(200).json({
            success: true,
            data: {
                overview: stats.rows[0] || { total_rewards: 0, total_paid_out: 0, total_pending: 0 },
                top_referrers: top.rows
            }
        });
    } catch (err) {
        console.error("Referral Stats Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getTiers = async (req, res) => {
    try {
        const resTiers = await db.pool.query("SELECT * FROM referral_tiers ORDER BY min_referrals ASC");
        return res.status(200).json({ success: true, data: resTiers.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateTier = async (req, res) => {
    try {
        const { id } = req.params;
        const { reward_amount, min_referrals, tier_name } = req.body;

        await db.pool.query(
            "UPDATE referral_tiers SET reward_amount = $1, min_referrals = $2, tier_name = $3 WHERE id = $4",
            [reward_amount, min_referrals, tier_name, id]
        );

        return res.status(200).json({ success: true, message: "Tier reward berhasil diperbarui." });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.createTier = async (req, res) => {
    try {
        const { reward_amount, min_referrals, tier_name } = req.body;
        await db.pool.query(
            "INSERT INTO referral_tiers (reward_amount, min_referrals, tier_name) VALUES ($1, $2, $3)",
            [reward_amount, min_referrals, tier_name]
        );
        return res.status(201).json({ success: true, message: "Tier reward baru berhasil ditambahkan." });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteTier = async (req, res) => {
    try {
        const { id } = req.params;
        await db.pool.query("DELETE FROM referral_tiers WHERE id = $1", [id]);
        return res.status(200).json({ success: true, message: "Tier reward berhasil dihapus." });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getGlobalConfig = async (req, res) => {
    try {
        const config = await referralService.getGlobalConfig();
        return res.status(200).json({ success: true, data: config });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateGlobalConfig = async (req, res) => {
    try {
        const { referee_discount, holding_period_days } = req.body;
        const config = JSON.stringify({ referee_discount, holding_period_days });

        // Check if exists
        const check = await db.pool.query("SELECT setting_key FROM site_settings WHERE setting_key = 'referral_config'");
        
        if (check.rows.length > 0) {
            await db.pool.query(
                "UPDATE site_settings SET setting_value = $1 WHERE setting_key = 'referral_config'",
                [config]
            );
        } else {
            await db.pool.query(
                "INSERT INTO site_settings (setting_key, setting_value) VALUES ('referral_config', $1)",
                [config]
            );
        }

        return res.status(200).json({ success: true, message: "Konfigurasi global referral berhasil diperbarui." });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllRewards = async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT rr.*, u1.name as referrer_name, u2.name as referee_name, i.total as invoice_total
            FROM referral_rewards rr
            JOIN users u1 ON rr.referrer_id = u1.id
            JOIN users u2 ON rr.referee_id = u2.id
            JOIN invoices i ON rr.invoice_id = i.id
        `;
        const params = [];

        if (status) {
            query += " WHERE rr.status = $1";
            params.push(status);
        }

        query += " ORDER BY rr.created_at DESC LIMIT 50";
        const result = await db.pool.query(query, params);

        return res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.cancelReward = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) return res.status(400).json({ message: "Alasan pembatalan wajib diisi." });

        await db.pool.query(
            "UPDATE referral_rewards SET status = 'cancelled', activated_at = NOW() WHERE id = $1",
            [id]
        );

        // Catat di log audit (opsional tergantung sistem audit yang ada)
        console.log(`⚠️  [Admin] Reward ID ${id} CANCELLED. Reason: ${reason}`);

        return res.status(200).json({ success: true, message: "Reward berhasil dibatalkan." });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getBannedWords = async (req, res) => {
    try {
        const result = await db.pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'banned_referral_codes'");
        const words = result.rows.length > 0 
            ? (typeof result.rows[0].setting_value === 'string' ? JSON.parse(result.rows[0].setting_value) : result.rows[0].setting_value)
            : [];
        return res.status(200).json({ success: true, data: words });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateBannedWords = async (req, res) => {
    try {
        const { words } = req.body;
        if (!Array.isArray(words)) {
            return res.status(400).json({ success: false, message: "Data harus berupa array kata-kata." });
        }

        const jsonWords = JSON.stringify(words.map(w => w.toLowerCase()));

        const check = await db.pool.query("SELECT setting_key FROM site_settings WHERE setting_key = 'banned_referral_codes'");
        if (check.rows.length > 0) {
            await db.pool.query(
                "UPDATE site_settings SET setting_value = $1 WHERE setting_key = 'banned_referral_codes'",
                [jsonWords]
            );
        } else {
            await db.pool.query(
                "INSERT INTO site_settings (setting_key, setting_value) VALUES ('banned_referral_codes', $1)",
                [jsonWords]
            );
        }

        return res.status(200).json({ success: true, message: "Daftar kata terlarang berhasil diperbarui." });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
