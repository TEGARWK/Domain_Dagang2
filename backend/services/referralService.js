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
                holding_period_days: 3
            };

            if (res.rows.length > 0) {
                const val = typeof res.rows[0].setting_value === 'string' ? JSON.parse(res.rows[0].setting_value) : res.rows[0].setting_value;
                config = { ...config, ...val };
            }

            // Combine with extra settings like banned words
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
            banned_words: ["admin", "official", "support"]
        };
    }

    /**
     * A. Generate & Save Referral Code
     * Dipanggil saat user registrasi/cek profil
     */
    async generateReferralCode(userId, userName = "") {
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
    }

    /**
     * B. Apply Referral Binding on Register
     */
    async applyReferralOnRegister(newUserId, referralCode) {
        try {
            // 1. Cari Referrer
            const rRes = await db.pool.query("SELECT id FROM users WHERE referral_code = $1", [referralCode]);
            const referrer = rRes.rows[0];

            if (!referrer) return { success: false, message: "Kode referral tidak valid." };
            if (referrer.id === newUserId) return { success: false, message: "Tidak bisa menggunakan kode sendiri." };

            // 2. Cek apakah sudah pernah direfer oleh orang lain (immutability)
            const uRes = await db.pool.query("SELECT referred_by_id FROM users WHERE id = $1", [newUserId]);
            if (uRes.rows[0]?.referred_by_id) return { success: false, message: "Anda sudah terdaftar via referral lain." };

            // 3. Bind
            await db.pool.query("UPDATE users SET referred_by_id = $1 WHERE id = $2", [referrer.id, newUserId]);
            
            return { success: true, referrerId: referrer.id };
        } catch (err) {
            console.error("[ReferralService] applyReferralOnRegister Error:", err.message);
            return { success: false, message: err.message };
        }
    }

    /**
     * C. Get Referrer Tier & Current Stats
     */
    async getReferrerTier(referrerId) {
        // Hitung referral sukses (status active)
        const countRes = await db.pool.query(
            "SELECT COUNT(*) FROM referral_rewards WHERE referrer_id = $1 AND status = 'active'",
            [referrerId]
        );
        const count = parseInt(countRes.rows[0].count);

        // Cari tier yang sesuai
        const tierRes = await db.pool.query(
            "SELECT * FROM referral_tiers WHERE min_referrals <= $1 ORDER BY min_referrals DESC LIMIT 1",
            [count]
        );
        
        const currentTier = tierRes.rows[0] || { tier_name: 'Starter', reward_amount: 20000 };
        
        // Cari tier berikutnya
        const nextTierRes = await db.pool.query(
            "SELECT * FROM referral_tiers WHERE min_referrals > $1 ORDER BY min_referrals ASC LIMIT 1",
            [count]
        );

        return {
            count,
            current: currentTier,
            next: nextTierRes.rows[0] || null
        };
    }

    /**
     * D. Process Reward (Initial PAID status)
     * Dipanggil asinkron dari webhook
     */
    async processReferralReward(invoiceId) {
        try {
            // 1. Ambil Info Invoice & Referee
            const invRes = await db.pool.query(`
                SELECT i.*, u.referred_by_id, u.name as referee_name
                FROM invoices i
                JOIN users u ON i.user_id = u.id
                WHERE i.id = $1
            `, [invoiceId]);
            
            const invoice = invRes.rows[0];
            if (!invoice || !invoice.referred_by_id) return; // Bukan referral transaction

            // 2. Cek Duplikasi
            const dupCheck = await db.pool.query("SELECT id FROM referral_rewards WHERE invoice_id = $1", [invoiceId]);
            if (dupCheck.rows.length > 0) return;

            // 3. Get Reward Amount from Referrer Tier
            const tierData = await this.getReferrerTier(invoice.referred_by_id);
            const rewardAmount = tierData.current.reward_amount;

            // 4. Get Global Config
            const config = await this.getGlobalConfig();
            const refereeDiscount = parseFloat(config.referee_discount || 5000);
            const holdingPeriodDays = parseInt(config.holding_period_days || 3);

            // 5. Insert Reward Record (Holding Period)
            const holdingUntil = new Date();
            holdingUntil.setDate(holdingUntil.getDate() + holdingPeriodDays);

            await db.pool.query(`
                INSERT INTO referral_rewards (
                    referrer_id, referee_id, invoice_id, reward_amount, 
                    referee_discount, status, holding_until
                ) VALUES ($1, $2, $3, $4, $5, 'pending', $6)
            `, [
                invoice.referred_by_id, invoice.user_id, invoice.id,
                rewardAmount, refereeDiscount, holdingUntil
            ]);

            // 6. Update Invoice Meta for Audit
            const currentMeta = invoice.discount_meta || {};
            currentMeta.referral = {
                referrer_id: invoice.referred_by_id,
                reward_on_release: rewardAmount,
                immediate_discount: refereeDiscount
            };

            await db.pool.query(
                "UPDATE invoices SET discount_meta = $1 WHERE id = $2",
                [JSON.stringify(currentMeta), invoiceId]
            );

            console.log(`🎁 [ReferralService] Reward PENDING for Invoice ${invoiceId}. Referrer: ${invoice.referred_by_id}`);

        } catch (err) {
            console.error("[ReferralService] processReferralReward Fatal Error:", err.message);
        }
    }

    /**
     * E. Activate Pending Rewards (Cron Hourly)
     */
    async activatePendingRewards() {
        const client = await db.pool.connect();
        try {
            // Cari reward yang sudah boleh dicairkan
            const pendingRes = await client.query(`
                SELECT * FROM referral_rewards 
                WHERE status = 'pending' AND holding_until <= NOW()
            `);

            if (pendingRes.rows.length === 0) return;

            console.log(`💰 [CRON] Found ${pendingRes.rows.length} referral rewards to ACTIVATE.`);

            for (let reward of pendingRes.rows) {
                try {
                    await client.query('BEGIN');

                    // 1. Update Referral Record
                    await client.query(
                        "UPDATE referral_rewards SET status = 'active', activated_at = NOW() WHERE id = $1",
                        [reward.id]
                    );

                    // 2. Credit to Wallet
                    await WalletService.credit(
                        reward.referrer_id,
                        parseFloat(reward.reward_amount),
                        'REFERRAL_REWARD',
                        reward.invoice_id,
                        `Reward dari referral sukses (Andi mengajak UserID: ${reward.referee_id})`
                    );

                    // 3. Update User Aggregate Stats
                    await client.query(
                        "UPDATE users SET referral_reward_total = referral_reward_total + $1 WHERE id = $2",
                        [reward.reward_amount, reward.referrer_id]
                    );

                    await client.query('COMMIT');
                    console.log(`✅ [CRON] Activated Reward ID ${reward.id} to User ${reward.referrer_id}`);
                } catch (innerErr) {
                    await client.query('ROLLBACK');
                    console.error(`❌ [CRON] Failed to activate reward ${reward.id}:`, innerErr.message);
                }
            }
        } finally {
            client.release();
        }
    }

    /**
     * G. Get Referral Dashboard Stats
     */
    async getReferralStats(userId) {
        const tierData = await this.getReferrerTier(userId);
        
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

        const stats = rewardsRes.rows[0];

        // Mask names for privacy
        const history = historyRes.rows.map(h => {
            const name = h.referee_name || 'User Member';
            const parts = name.split(' ');
            const firstName = parts[0] || 'User';
            const masked = firstName.substring(0, 2) + '**' + (firstName.length > 4 ? firstName.substring(firstName.length - 1) : '');
            return {
                ...h,
                referee_name_masked: masked
            };
        });

        return {
            total_referrals: tierData.count,
            pending_rewards: parseFloat(stats.pending || 0),
            active_rewards: parseFloat(stats.active || 0),
            current_tier: tierData.current.tier_name,
            reward_per_referral: tierData.current.reward_amount,
            next_tier: tierData.next ? {
                name: tierData.next.tier_name,
                min: tierData.next.min_referrals,
                needed: tierData.next.min_referrals - tierData.count
            } : null,
            referral_history: history
        };
    }

    /**
     * H. Check if User is Eligible for Referee Discount (First Purchase)
     * Kondisi: Punya referred_by_id DAN belum pernah punya invoice yang PAID.
     */
    async checkRefereeDiscountEligibility(userId) {
        try {
            // 1. Cek apakah di-refer orang lain
            const userRes = await db.pool.query(
                "SELECT referred_by_id FROM users WHERE id = $1",
                [userId]
            );
            
            if (!userRes.rows[0]?.referred_by_id) return { eligible: false, message: "Bukan pengguna referral." };

            // 2. Cek riwayat invoice
            const invRes = await db.pool.query(
                "SELECT id FROM invoices WHERE user_id = $1 AND status = 'paid' LIMIT 1",
                [userId]
            );

            if (invRes.rows.length > 0) {
                return { eligible: false, message: "Hanya berlaku untuk transaksi pertama." };
            }

            const config = await this.getGlobalConfig();

            return { 
                eligible: true, 
                discountAmount: parseFloat(config.referee_discount || 5000), 
                referrerId: userRes.rows[0].referred_by_id 
            };

        } catch (err) {
            console.error("[ReferralService] checkRefereeDiscountEligibility Error:", err.message);
            return { eligible: false, message: "Error checking eligibility." };
        }
    }

    /**
     * I. Update Referral Code (Custom)
     * Rules:
     * 1. Check if user is Silver/Gold (min_referrals >= 5)
     * 2. Only alphanum 4-15 chars
     * 3. Must be unique
     * 4. Not in Banned Words
     */
    async updateReferralCode(userId, newCode) {
        try {
            const code = newCode.trim().toUpperCase();

            // 1. Regex Validation
            const regex = /^[A-Z0-9]{4,15}$/;
            if (!regex.test(code)) {
                throw new Error("Kode harus berupa Alfanumerik (A-Z, 0-9) dengan panjang 4-15 karakter.");
            }

            // 2. Uniqueness Check
            const uniqueCheck = await db.pool.query("SELECT id FROM users WHERE referral_code = $1", [code]);
            if (uniqueCheck.rows.length > 0) {
                throw new Error("Kode referral sudah digunakan oleh orang lain.");
            }

            // 3. Banned Words Check
            const config = await this.getGlobalConfig();
            
            // Normalisasi sederhana: Ganti angka ke huruf yang mirip untuk deteksi bypass (0->O, 1->I, 3->E, 4->A, 5->S)
            const normalizedCode = code
                .replace(/0/g, 'O')
                .replace(/1/g, 'I')
                .replace(/3/g, 'E')
                .replace(/4/g, 'A')
                .replace(/5/g, 'S');

            if (config.banned_words.some(word => {
                const upperWord = word.toUpperCase();
                return code.includes(upperWord) || normalizedCode.includes(upperWord);
            })) {
                throw new Error("Kode ini mengandung kata yang dilarang oleh sistem.");
            }

            // 4. Tier Check (Silver/Gold only -> referrals >= 5)
            const tierData = await this.getReferrerTier(userId);
            if (tierData.count < 5) {
                throw new Error("Fitur Custom Kode hanya tersedia untuk member Tier Silver & Gold (Min. 5 Referral Sukses).");
            }

            // 5. Update
            await db.pool.query(
                "UPDATE users SET referral_code = $1, referral_code_customized = TRUE WHERE id = $2",
                [code, userId]
            );

            return { success: true, newCode: code };
        } catch (err) {
            console.error("[ReferralService] updateReferralCode Error:", err.message);
            return { success: false, message: err.message };
        }
    }
}

module.exports = new ReferralService();
