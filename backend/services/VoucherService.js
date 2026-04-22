const db = require('../config/db');
const redisClient = require('../config/redisClient');
const discountService = require('./discountService');

/**
 * VOUCHER SERVICE
 * Fokus pada klaim (Redis-backed quota) dan penerapan voucher pada invoice.
 */

class VoucherService {
    /**
     * A. Claim Voucher (Atomic via Redis)
     * @param {number} userId 
     * @param {string|number} voucherId 
     */
    async claimVoucher(userId, voucherId) {
        // 1. Cari Voucher
        const vRes = await db.pool.query(
            "SELECT * FROM vouchers WHERE id = $1 AND is_active = true",
            [voucherId]
        );
        const voucher = vRes.rows[0];

        if (!voucher) throw new Error("Voucher tidak valid atau sudah tidak aktif.");

        // 2. Cek Waktu
        const now = new Date();
        if (now < voucher.started_at) throw new Error("Voucher belum dimulai.");
        if (now > voucher.expired_at) throw new Error("Voucher sudah kedaluwarsa.");
        
        // 2.a Cek New User Only
        if (voucher.is_new_user_only) {
            const trxCheck = await db.pool.query(
                "SELECT id FROM invoices WHERE user_id = $1 AND status = 'paid' LIMIT 1",
                [userId]
            );
            if (trxCheck.rows.length > 0) {
                throw new Error("Voucher ini hanya berlaku untuk pelanggan baru yang belum memiliki transaksi sukses.");
            }
        }

        // 3. Cek Klaim Sebelumnya
        const claimCheck = await db.pool.query(
            "SELECT id FROM voucher_claims WHERE voucher_id = $1 AND user_id = $2",
            [voucher.id, userId]
        );
        if (claimCheck.rows.length >= voucher.max_use_per_user) {
            throw new Error(`Anda sudah menggunakan jatah klaim untuk voucher ini (${voucher.max_use_per_user}x).`);
        }

        // 4. Cek Kuota di Redis
        const redisKey = `voucher:quota:${voucher.id}`;
        
        // Inisialisasi jika belum ada di Redis (Self-healing)
        let quota = await redisClient.getValue(redisKey);
        if (quota === null) {
            await this.initVoucherQuotaToRedis(voucher.id);
        }

        // Atomic Decrement
        const remaining = await redisClient.atomicDecrement(redisKey);
        
        if (remaining === null) {
            // Redis error fallback: Cek DB (Kurang aman tapi sistem tetap jalan)
            if (voucher.quota_used >= voucher.quota) throw new Error("Voucher sudah habis.");
        } else if (remaining < 0) {
            // Kembalikan jika ternyata sudah habis
            await redisClient.atomicDecrement(redisKey); // This is not ideal, should increment back but decr(-1) is the same as incr
            // Note: In some redis libs decr by negative is not supported or different. 
            // We use simple approach:
            await redisClient.setWithExpiry(redisKey, 0, 86400 * 30); 
            throw new Error("Voucher sudah habis (kuota penuh).");
        }

        // 5. Simpan Klaim di DB
        try {
            await db.pool.query(
                "INSERT INTO voucher_claims (voucher_id, user_id, status) VALUES ($1, $2, 'claimed')",
                [voucher.id, userId]
            );
            return { success: true, voucherCode: voucher.code, expiredAt: voucher.expired_at };
        } catch (err) {
            // Rollback Redis quota if DB insert fails (unique constraint etc)
            await redisClient.atomicDecrement(redisKey); // Reverse by logic
            throw new Error("Gagal mengklaim voucher. Anda mungkin sudah mengklaimnya.");
        }
    }

    /**
     * B. Apply Voucher to Invoice
     */
    async applyVoucher(userId, voucherCode, invoiceId, subtotal) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Cek Validitas Klaim
            const res = await client.query(`
                SELECT vc.*, v.discount_type, v.discount_value, v.min_transaction, v.applicable_to, v.max_discount, v.id as v_id
                FROM voucher_claims vc
                JOIN vouchers v ON vc.voucher_id = v.id
                WHERE vc.user_id = $1 AND v.code = $2 AND vc.status = 'claimed'
            `, [userId, voucherCode]);

            const claim = res.rows[0];
            if (!claim) throw new Error("Klaim voucher tidak ditemukan atau sudah digunakan.");

            // 2. Cek Min Transaction
            if (parseFloat(subtotal) < parseFloat(claim.min_transaction)) {
                throw new Error(`Minimum transaksi untuk voucher ini adalah Rp ${parseFloat(claim.min_transaction).toLocaleString('id-ID')}`);
            }

            // 3. Hitung Diskon
            const { discountAmount, finalPrice } = discountService.calculateDiscount(
                parseFloat(subtotal),
                claim.discount_type,
                parseFloat(claim.discount_value),
                parseFloat(claim.max_discount || 0)
            );

            // 4. Update Invoice
            await discountService.applyDiscountToInvoice(invoiceId, {
                original_subtotal: subtotal,
                discount_amount: discountAmount,
                discount_source: 'voucher',
                meta: {
                    voucher_id: claim.v_id,
                    voucher_code: voucherCode,
                    discount_type: claim.discount_type,
                    discount_value: claim.discount_value
                }
            }, client);

            // 5. Update Status Klaim & Quota di DB
            await client.query(
                "UPDATE voucher_claims SET status = 'used', used_at = NOW(), invoice_id = $1 WHERE id = $2",
                [invoiceId, claim.id]
            );
            await client.query(
                "UPDATE vouchers SET quota_used = quota_used + 1 WHERE id = $1",
                [claim.v_id]
            );

            await client.query('COMMIT');
            return { discountAmount, finalPrice };

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * D. Initialize / Reset Quota in Redis
     */
    async initVoucherQuotaToRedis(voucherId) {
        const vRes = await db.pool.query("SELECT id, quota, quota_used, expired_at FROM vouchers WHERE id = $1", [voucherId]);
        const v = vRes.rows[0];
        if (!v) return;

        const remainingQuota = v.quota - v.quota_used;
        const ttl = Math.max(0, Math.floor((new Date(v.expired_at) - new Date()) / 1000));
        
        await redisClient.setWithExpiry(`voucher:quota:${v.id}`, Math.max(0, remainingQuota).toString(), ttl || 86400 * 7);
    }

    /**
     * E. Get Voucher Info
     */
    async getVoucherInfo(voucherCode, userId) {
        const vRes = await db.pool.query(`
            SELECT v.*, 
            (SELECT status FROM voucher_claims WHERE voucher_id = v.id AND user_id = $2) as user_status
            FROM vouchers v WHERE v.code = $1
        `, [voucherCode, userId]);
        
        const v = vRes.rows[0];
        if (!v) return null;

        const redisQuota = await redisClient.getValue(`voucher:quota:${v.id}`);
        
        return {
            id: v.id,
            code: v.code,
            type: v.discount_type,
            value: v.discount_value,
            min_transaction: v.min_transaction,
            remaining_quota: redisQuota !== null ? parseInt(redisQuota) : (v.quota - v.quota_used),
            user_status: v.user_status,
            expired_at: v.expired_at,
            is_active: v.is_active && (new Date() >= v.started_at) && (new Date() <= v.expired_at)
        };
    }

    /**
     * F. Get Public Vouchers (for guests)
     */
    async getPublicVouchers() {
        // Fetch active, non-expired, and non-automatic vouchers
        const query = `
            SELECT id, title, description, code, 
                   discount_type as type, discount_value as value, 
                   min_transaction as min_purchase, max_discount,
                   started_at as start_date, expired_at as valid_until, expired_at as end_date,
                   is_new_user_only, banner_image, applicable_to as eligible_tlds, eligible_actions, is_automatic 
            FROM vouchers 
            WHERE is_active = true 
              AND expired_at > NOW() 
              AND started_at <= NOW()
              AND quota > quota_used
              AND is_automatic = false
            ORDER BY created_at DESC
        `;
        const result = await db.pool.query(query);
        return result.rows;
    }

    /**
     * G. Get Available Vouchers (for logged-in users)
     */
    async getAvailableVouchers(userId) {
        // Similar to public vouchers, but we can also filter out the ones already claimed by the user
        const query = `
            WITH user_stats AS (
                SELECT COUNT(*) as paid_invoices 
                FROM invoices 
                WHERE user_id = $1 AND status = 'paid'
            )
            SELECT v.id, v.title, v.description, v.code, 
                   v.discount_type as type, v.discount_value as value, 
                   v.min_transaction as min_purchase, v.max_discount,
                   v.started_at as start_date, v.expired_at as valid_until, v.expired_at as end_date,
                   v.is_new_user_only, v.banner_image, v.applicable_to as eligible_tlds, v.eligible_actions, v.is_automatic
            FROM vouchers v, user_stats us
            WHERE v.is_active = true 
              AND v.expired_at > NOW() 
              AND v.started_at <= NOW()
              AND v.quota > v.quota_used
              -- Rule: New User Only protocol
              AND (v.is_new_user_only = false OR us.paid_invoices = 0)
              -- Rule: Segment protocol (if segments are mapped in the future, currently we assume 'all' or specific matches)
              AND (v.segment = 'all' OR v.segment IS NULL) 
              -- Rule: Max use per user protocol
              AND (
                  SELECT COUNT(*) FROM voucher_claims vc 
                  WHERE vc.voucher_id = v.id AND vc.user_id = $1
              ) < v.max_use_per_user
            ORDER BY v.created_at DESC
        `;
        const result = await db.pool.query(query, [userId]);
        return result.rows;
    }

    /**
     * H. Validate Voucher for Cart (New Method for Checkout Integration)
     * @param {number} userId 
     * @param {string} voucherCode 
     * @param {Array} cartItems [{ name, action, tld, ... }]
     * @returns {object} { eligible, discountAmount, message, voucher }
     */
    async validateVoucherForCart(userId, voucherCode, cartItems, targetInvoiceId = null) {
        if (!voucherCode) return { eligible: false, discountAmount: 0, message: "No voucher code provided." };

        // 1. Fetch Voucher
        const vRes = await db.pool.query(
            "SELECT * FROM vouchers WHERE code = $1 AND is_active = true",
            [voucherCode]
        );
        const voucher = vRes.rows[0];
        if (!voucher) return { eligible: false, discountAmount: 0, message: "Voucher tidak ditemukan atau sudah tidak aktif." };

        // 2. Check Expiry
        const now = new Date();
        if (now < voucher.started_at) return { eligible: false, discountAmount: 0, message: "Voucher belum dimulai." };
        if (now > voucher.expired_at) return { eligible: false, discountAmount: 0, message: "Voucher sudah kedaluwarsa." };

        // 3. User Specific Checks (New User)
        if (voucher.is_new_user_only) {
            const trxCheck = await db.pool.query(
                "SELECT id FROM invoices WHERE user_id = $1 AND status = 'paid' LIMIT 1",
                [userId]
            );
            if (trxCheck.rows.length > 0) {
                return { eligible: false, discountAmount: 0, message: "Voucher ini hanya berlaku untuk pelanggan baru." };
            }
        }

        // 4. Claim Status & Locking Check
        // A claim is eligible if it is 'claimed' AND (it's not yet linked OR it's already linked to THIS invoice)
        const claimRes = await db.pool.query(
            "SELECT id, status, invoice_id FROM voucher_claims WHERE voucher_id = $1 AND user_id = $2 AND status = 'claimed' AND (invoice_id IS NULL OR invoice_id = $3) ORDER BY (invoice_id = $3) DESC LIMIT 1",
            [voucher.id, userId, targetInvoiceId]
        );
        if (claimRes.rows.length === 0) {
            return { eligible: false, discountAmount: 0, message: "Voucher belum diklaim atau sudah digunakan di invoice lain." };
        }

        // 5. Item-Level Validation (TLDs and Actions)
        const eligibleTlds = voucher.applicable_to; // Array of TLDs, e.g. [".id", ".com"]
        const eligibleActions = voucher.eligible_actions; // Array, e.g. ["register", "renew"]

        const hasCondition = (eligibleTlds && eligibleTlds.length > 0) || (eligibleActions && eligibleActions.length > 0);
        let passesItemValidation = !hasCondition;

        if (hasCondition) {
            passesItemValidation = cartItems.some(item => {
                const tldMatch = !eligibleTlds || eligibleTlds.length === 0 || eligibleTlds.includes(item.tld);
                const actionMatch = !eligibleActions || eligibleActions.length === 0 || eligibleActions.includes(item.action);
                return tldMatch && actionMatch;
            });
        }

        if (!passesItemValidation) {
            let errorMsg = "Voucher tidak berlaku untuk item pilihah Anda.";
            if (eligibleTlds && eligibleTlds.length > 0) errorMsg = `Voucher hanya berlaku untuk TLD: ${eligibleTlds.join(', ')}`;
            return { eligible: false, discountAmount: 0, message: errorMsg };
        }

        // 6. Subtotal & Threshold
        const subtotal = cartItems.reduce((acc, item) => acc + (parseFloat(item.base_price) * (item.duration || 1)), 0);
        if (subtotal < parseFloat(voucher.min_transaction)) {
            return { 
                eligible: false, 
                discountAmount: 0, 
                message: `Minimum transaksi untuk voucher ini adalah Rp ${parseFloat(voucher.min_transaction).toLocaleString('id-ID')}` 
            };
        }

        // 7. Calculate Discount
        const { discountAmount } = discountService.calculateDiscount(
            subtotal,
            voucher.discount_type,
            parseFloat(voucher.discount_value),
            parseFloat(voucher.max_discount || 0)
        );

        return {
            eligible: true,
            discountAmount,
            message: "Voucher berhasil diterapkan.",
            claimId: claimRes.rows[0].id,
            voucher: {
                id: voucher.id,
                code: voucher.code,
                type: voucher.discount_type,
                value: voucher.discount_value
            }
        };
    }
    /**
     * I. Finalize Voucher Usage (On Payment Success)
     * @param {string} invoiceId 
     * @param {object} client (Optional db client for transactions)
     */
    async finalizeVoucherUsage(invoiceId, client = db.pool) {
        try {
            // 1. Find the claim linked to this invoice
            const claimRes = await client.query(
                "SELECT id, voucher_id FROM voucher_claims WHERE invoice_id = $1 AND status = 'claimed' LIMIT 1",
                [invoiceId]
            );

            if (claimRes.rows.length === 0) return; // No pending claim to finalize

            const claim = claimRes.rows[0];

            // 2. Mark as Used
            await client.query(
                "UPDATE voucher_claims SET status = 'used', used_at = NOW() WHERE id = $1",
                [claim.id]
            );

            // 3. Increment Quota Used in Vouchers table
            await client.query(
                "UPDATE vouchers SET quota_used = quota_used + 1 WHERE id = $1",
                [claim.voucher_id]
            );

            console.log(`[VoucherService] Finalized usage for Invoice ${invoiceId}, Claim ${claim.id}`);
        } catch (err) {
            console.error(`[VoucherService] Error finalizing usage for Invoice ${invoiceId}:`, err);
            // We don't necessarily want to throw here to avoid blocking payment completion, 
            // but in a strict system we might.
        }
    }
}

module.exports = new VoucherService();
