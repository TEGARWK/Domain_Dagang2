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
        const stats = await db.pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users,
                (SELECT COUNT(*) FROM users WHERE role = 'user' AND registrar_customer_id IS NOT NULL) as total_merchants,
                (SELECT SUM(reward_amount) FROM referral_rewards WHERE status = 'active') as total_paid,
                (SELECT SUM(reward_amount) FROM referral_rewards WHERE status = 'pending') as total_pending,
                (SELECT COUNT(*) FROM referral_rewards) as total_rewards
        `);

        const configRes = await db.pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'referral_config'");
        
        return res.status(200).json({
            success: true,
            data: {
                overview: {
                    total_users: parseInt(stats.rows[0].total_users || 0),
                    total_merchants: parseInt(stats.rows[0].total_merchants || 0),
                    total_paid: parseFloat(stats.rows[0].total_paid || 0),
                    total_pending: parseFloat(stats.rows[0].total_pending || 0),
                    total_rewards: parseInt(stats.rows[0].total_rewards || 0)
                },
                config: configRes.rows[0]?.setting_value || {}
            }
        });
    } catch (err) {
        console.error("Referral Stats Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getReferralMerchants = async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                u.id, u.name, u.email, u.referral_code,
                (SELECT COUNT(*) FROM users WHERE referred_by_id = u.id) as total_invite,
                COALESCE((SELECT SUM(reward_amount) FROM referral_rewards WHERE referrer_id = u.id AND status = 'active'), 0) as active_commission,
                COALESCE((SELECT SUM(reward_amount) FROM referral_rewards WHERE referrer_id = u.id AND status = 'pending'), 0) as pending_commission
            FROM users u
            WHERE u.role = 'user' 
              AND u.registrar_customer_id IS NOT NULL
        `;
        const params = [];

        if (search) {
            query += " AND (u.name ILIKE $1 OR u.email ILIKE $1 OR u.referral_code ILIKE $1)";
            params.push(`%${search}%`);
        }

        query += " ORDER BY total_invite DESC";
        const result = await db.pool.query(query, params);

        return res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
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
        const { referee_discount, holding_period_days, commission_tier_1_percent, commission_tier_2_percent } = req.body;
        
        // Fetch current config first to preserve other fields like banned_words
        const configRes = await db.pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'referral_config'");
        let currentConfig = configRes.rows.length > 0 
            ? (typeof configRes.rows[0].setting_value === 'string' ? JSON.parse(configRes.rows[0].setting_value) : configRes.rows[0].setting_value)
            : {};

        const updatedConfig = {
            ...currentConfig,
            referee_discount: parseFloat(referee_discount || 0),
            holding_period_days: parseInt(holding_period_days),
            commission_tier_1_percent: parseFloat(commission_tier_1_percent),
            commission_tier_2_percent: parseFloat(commission_tier_2_percent)
        };

        const configJson = JSON.stringify(updatedConfig);

        await db.pool.query(`
            INSERT INTO site_settings (setting_key, setting_value)
            VALUES ('referral_config', $1)
            ON CONFLICT (setting_key)
            DO UPDATE SET setting_value = EXCLUDED.setting_value
        `, [configJson]);

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
