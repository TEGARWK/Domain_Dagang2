const db = require('../config/db');
const discountService = require('./discountService');
const WalletService = require('./WalletService');
const crypto = require('crypto');

/**
 * REFERRAL SERVICE
 * Menangani pembuatan kode referral, binding user baru, 
 * pemrosesan reward (pending), dan aktivasi reward otomatis.
 */

class ReferralService {
    /**
     * Helper: Get Global Referral Config from DB
     */
    async getGlobalConfig() {
        try {
            const res = await db.pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'referral_config'");
            let config = {
                referee_discount: 5000,
                holding_period_days: 3,
                commission_tier_1_percent: 20,
                commission_tier_2_percent: 10
            };

            if (res.rows.length > 0) {
                const val = typeof res.rows[0].setting_value === 'string' ? JSON.parse(res.rows[0].setting_value) : res.rows[0].setting_value;
                config = { ...config, ...val };
            }

            const bannedRes = await db.pool.query("SELECT setting_value FROM site_settings WHERE setting_key = 'banned_referral_codes'");
            config.banned_words = bannedRes.rows.length > 0 
                ? (typeof bannedRes.rows[0].setting_value === 'string' ? JSON.parse(bannedRes.rows[0].setting_value) : bannedRes.rows[0].setting_value)
                : ["admin", "official", "support"];

            return config;
        } catch (err) {
            console.error("[ReferralService] Failed to fetch config:", err.message);
        }
        return {
            referee_discount: 5000,
            holding_period_days: 3,
            commission_tier_1_percent: 20,
            commission_tier_2_percent: 10,
            banned_words: ["admin", "official", "support"]
        };
    }

    /**
     * A. Generate & Save Referral Code
     */
    async generateReferralCode(userId, userName = "") {
        try {
            const userRes = await db.pool.query("SELECT role FROM users WHERE id = $1", [userId]);
            if (userRes.rows[0]?.role === 'admin') return null;

            let code;
            let isUnique = false;
            const nameFallback = userName || "USER";
            const cleanName = nameFallback.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6) || "REF";

            while (!isUnique) {
                const random = crypto.randomBytes(2).toString('hex').toUpperCase();
                code = `${cleanName}-${random}`;
                const check = await db.pool.query("SELECT id FROM users WHERE referral_code = $1", [code]);
                if (check.rows.length === 0) isUnique = true;
            }

            await db.pool.query("UPDATE users SET referral_code = $1 WHERE id = $2", [code, userId]);
            return code;
        } catch (err) {
            console.error("[ReferralService] generateReferralCode Error:", err.message);
            return null;
        }
    }

    /**
     * B. Apply Referral Binding on Register
     */
    async applyReferralOnRegister(newUserId, referralCode) {
        try {
            const rRes = await db.pool.query("SELECT id FROM users WHERE referral_code = $1", [referralCode]);
            const referrer = rRes.rows[0];

            if (!referrer) return { success: false, message: "Kode referral tidak valid." };
            if (referrer.id === newUserId) return { success: false, message: "Tidak bisa menggunakan kode sendiri." };

            const uRes = await db.pool.query("SELECT referred_by_id FROM users WHERE id = $1", [newUserId]);
            if (uRes.rows[0]?.referred_by_id) return { success: false, message: "Anda sudah terdaftar via referral lain." };

            await db.pool.query("UPDATE users SET referred_by_id = $1 WHERE id = $2", [referrer.id, newUserId]);
            return { success: true, referrerId: referrer.id };
        } catch (err) {
            console.error("[ReferralService] applyReferralOnRegister Error:", err.message);
            return { success: false, message: err.message };
        }
    }

    /**
     * C. Get Referrer Tier
     */
    async getReferrerTier(referrerId) {
        try {
            const countRes = await db.pool.query(
                "SELECT COUNT(*) FROM referral_rewards WHERE referrer_id = $1 AND status = 'active'",
                [referrerId]
            );
            const count = parseInt(countRes.rows[0].count);

            const tierRes = await db.pool.query(
                "SELECT * FROM referral_tiers WHERE min_referrals <= $1 ORDER BY min_referrals DESC LIMIT 1",
                [count]
            );
            const currentTier = tierRes.rows[0] || { tier_name: 'Starter', reward_amount: 20000 };
            
            const nextTierRes = await db.pool.query(
                "SELECT * FROM referral_tiers WHERE min_referrals > $1 ORDER BY min_referrals ASC LIMIT 1",
                [count]
            );

            return { count, current: currentTier, next: nextTierRes.rows[0] || null };
        } catch (err) {
            return { count: 0, current: { tier_name: 'Starter' }, next: null };
        }
    }

    /**
     * D. Process Reward
     */
    async processReferralReward(invoiceId) {
        try {
            const invRes = await db.pool.query(`
                SELECT i.*, u.referred_by_id, u.name as referee_name
                FROM invoices i
                JOIN users u ON i.user_id = u.id
                WHERE i.id = $1
            `, [invoiceId]);
            
            const invoice = invRes.rows[0];
            if (!invoice || !invoice.referred_by_id) return;

            // SECURITY FIX: JANGAN berikan reward untuk Top-Up
            if (invoice.type === 'TOPUP' || (invoice.id && invoice.id.startsWith('TOPUP-'))) {
                console.log(`🚫 [ReferralService] Reward SKIPPED for Invoice ${invoiceId} (Transaction Type: TOPUP)`);
                return;
            }

            const dupCheck = await db.pool.query("SELECT id FROM referral_rewards WHERE invoice_id = $1", [invoiceId]);
            if (dupCheck.rows.length > 0) return;

            const config = await this.getGlobalConfig();
            const tier1Percent = parseFloat(config.commission_tier_1_percent || 20);
            const tier2Percent = parseFloat(config.commission_tier_2_percent || 10);
            const holdingPeriodDays = parseInt(config.holding_period_days || 3);
            const refereeDiscount = parseFloat(config.referee_discount || 5000);

            const invoiceTotal = parseFloat(invoice.final_amount || invoice.total || 0);
            const holdingUntil = new Date();
            holdingUntil.setDate(holdingUntil.getDate() + holdingPeriodDays);

            const referrerId = invoice.referred_by_id;
            const rewardTier1 = (invoiceTotal * tier1Percent) / 100;

            await db.pool.query(`
                INSERT INTO referral_rewards (
                    referrer_id, referee_id, invoice_id, reward_amount, 
                    referee_discount, status, holding_until, reward_tier
                ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, 1)
            `, [referrerId, invoice.user_id, invoice.id, rewardTier1, refereeDiscount, holdingUntil]);

            const referrerRes = await db.pool.query("SELECT referred_by_id FROM users WHERE id = $1", [referrerId]);
            const grandReferrerId = referrerRes.rows[0]?.referred_by_id;

            if (grandReferrerId) {
                const rewardTier2 = (invoiceTotal * tier2Percent) / 100;
                await db.pool.query(`
                    INSERT INTO referral_rewards (
                        referrer_id, referee_id, invoice_id, reward_amount, 
                        referee_discount, status, holding_until, reward_tier
                    ) VALUES ($1, $2, $3, $4, 0, 'pending', $5, 2)
                `, [grandReferrerId, invoice.user_id, invoice.id, rewardTier2, holdingUntil]);
            }

            console.log(`🎁 [ReferralService] Tier 1 Reward (Rp ${rewardTier1}) PENDING for Invoice ${invoiceId}.`);
        } catch (err) {
            console.error("[ReferralService] processReferralReward Fatal Error:", err.message);
        }
    }

    /**
     * E. Activate Pending Rewards
     */
    async activatePendingRewards() {
        const client = await db.pool.connect();
        try {
            const pendingRes = await client.query(`
                SELECT * FROM referral_rewards WHERE status = 'pending' AND holding_until <= NOW()
            `);
            if (pendingRes.rows.length === 0) return;

            for (let reward of pendingRes.rows) {
                try {
                    await client.query('BEGIN');
                    await client.query("UPDATE referral_rewards SET status = 'active', activated_at = NOW() WHERE id = $1", [reward.id]);
                    await WalletService.credit(reward.referrer_id, parseFloat(reward.reward_amount), 'REFERRAL_REWARD', reward.invoice_id, `Komisi referral dari transaksi ${reward.invoice_id}`);
                    await client.query("UPDATE users SET referral_reward_total = referral_reward_total + $1 WHERE id = $2", [reward.reward_amount, reward.referrer_id]);
                    await client.query('COMMIT');
                } catch (innerErr) {
                    await client.query('ROLLBACK');
                }
            }
        } finally {
            client.release();
        }
    }

    /**
     * F. Check Eligible for Referee Discount
     */
    async checkRefereeDiscountEligibility(userId) {
        try {
            if (!userId) return { eligible: false };
            const userRes = await db.pool.query(
                "SELECT id, referred_by_id, referee_discount_used FROM users WHERE id = $1",
                [userId]
            );
            const user = userRes.rows[0];

            if (!user) return { eligible: false, message: "User tidak ditemukan." };
            if (!user.referred_by_id) return { eligible: false, message: "Bukan pendaftar via referral." };
            if (user.referee_discount_used) return { eligible: false, message: "Diskon sudah pernah digunakan." };

            const config = await this.getGlobalConfig();
            const discountPercent = parseFloat(config.referee_discount || 0);

            if (discountPercent <= 0) return { eligible: false, message: "Program diskon sedang tidak aktif." };

            return { 
                eligible: true, 
                percent: discountPercent,
                message: `Anda berhak mendapatkan diskon pendaftar baru sebesar ${discountPercent}%`
            };
        } catch (err) {
            console.error("[ReferralService] checkEligibility Error:", err.message);
            return { eligible: false, message: "Gagal memverifikasi diskon." };
        }
    }

    /**
     * G. Get Referral Dashboard Stats
     */
    async getReferralStats(userId) {
        try {
            const tierData = await this.getReferrerTier(userId);
            const totalFriendsRes = await db.pool.query("SELECT COUNT(*) FROM users WHERE referred_by_id = $1", [userId]);
            const rewardsRes = await db.pool.query(`
                SELECT 
                    SUM(CASE WHEN status = 'pending' THEN reward_amount ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'active' THEN reward_amount ELSE 0 END) as active
                FROM referral_rewards WHERE referrer_id = $1
            `, [userId]);

            const historyRes = await db.pool.query(`
                SELECT rr.*, u.name as referee_name
                FROM referral_rewards rr
                JOIN users u ON rr.referee_id = u.id
                WHERE rr.referrer_id = $1
                ORDER BY rr.created_at DESC LIMIT 10
            `, [userId]);

            const userRes = await db.pool.query("SELECT referred_by_id, referee_discount_used, referral_code FROM users WHERE id = $1", [userId]);
            const config = await this.getGlobalConfig();

            return {
                referral_code: userRes.rows[0]?.referral_code,
                total_referrals: parseInt(totalFriendsRes.rows[0].count),
                successful_referrals: tierData.count,
                pending_rewards: parseFloat(rewardsRes.rows[0]?.pending || 0),
                active_rewards: parseFloat(rewardsRes.rows[0]?.active || 0),
                current_tier: tierData.current.tier_name,
                commission_tier_1: config.commission_tier_1_percent,
                commission_tier_2: config.commission_tier_2_percent,
                referral_history: historyRes.rows,
                next_tier: tierData.next ? { name: tierData.next.tier_name, min: tierData.next.min_referrals, needed: tierData.next.min_referrals - tierData.count } : null
            };
        } catch (err) {
            console.error("[ReferralService] getStats Error:", err.message);
            return { total_referrals: 0 };
        }
    }

    async updateReferralCode(userId, newCode) {
        try {
            const code = newCode.trim().toUpperCase();
            const regex = /^[A-Z0-9]{4,15}$/;
            if (!regex.test(code)) throw new Error("Kode tidak valid.");
            const uniqueCheck = await db.pool.query("SELECT id FROM users WHERE referral_code = $1", [code]);
            if (uniqueCheck.rows.length > 0) throw new Error("Kode sudah digunakan.");
            await db.pool.query("UPDATE users SET referral_code = $1, referral_code_customized = TRUE WHERE id = $2", [code, userId]);
            return { success: true, newCode: code };
        } catch (err) {
            return { success: false, message: err.message };
        }
    }
}

module.exports = new ReferralService();
