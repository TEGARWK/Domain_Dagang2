const db = require('../config/db');
const redisClient = require('../config/redisClient');
const discountService = require('./discountService');
const fs = require('fs');

/**
 * VOUCHER SERVICE
 * Fokus pada klaim (Redis-backed quota) dan penerapan voucher pada invoice.
 * Menggabungkan fitur modern (Redis, Referral) dengan fitur admin (CRUD).
 * Schema standard: discount_type, discount_value, quota, quota_used, min_transaction, started_at, expired_at.
 */

class VoucherService {
    // ---------------------------------------------------------
    // A. USER METHODS (Modern / Redis-backed)
    // ---------------------------------------------------------

    /**
     * Get Public Vouchers (for guests)
     */
    async getPublicVouchers() {
        const query = `
            SELECT id, title, description, code, 
                   discount_type as type, discount_value as value, 
                   min_transaction as min_purchase, max_discount,
                   started_at as start_date, expired_at as valid_until, expired_at as end_date,
                   is_new_user_only, banner_image, applicable_to as eligible_tlds, eligible_actions, is_automatic 
            FROM vouchers 
            WHERE is_active = true 
              AND (expired_at > NOW() OR expired_at IS NULL)
              AND (started_at <= NOW() OR started_at IS NULL)
              AND (quota > quota_used OR quota = 0)
              AND segment = 'all'
            ORDER BY priority DESC, created_at DESC
        `;
        const result = await db.pool.query(query);
        return result.rows;
    }

    /**
     * Get Available Claimable Vouchers for a user
     */
    async getAvailableClaimableVouchers(userId) {
        try {
            // Fetch user role
            const userRes = await db.pool.query("SELECT role FROM users WHERE id = $1", [userId]);
            const userRole = userRes.rows[0]?.role || 'user';
            
            // Define allowed segments
            const allowedSegments = userRole === 'premium' || userRole === 'reseller' 
                ? "('all', 'premium')" 
                : "('all', 'regular')";

            const query = `
                SELECT * FROM vouchers 
                WHERE is_active = TRUE 
                AND is_automatic = FALSE
                AND quota > quota_used
                AND expired_at > NOW()
                AND segment IN ${allowedSegments}
                AND id NOT IN (SELECT voucher_id FROM voucher_claims WHERE user_id = $1)
                ORDER BY priority DESC, created_at DESC
            `;
            const { rows } = await db.pool.query(query, [userId]);
            return rows;
        } catch (error) {
            console.error("VoucherService.getAvailableClaimableVouchers Error:", error);
            throw error;
        }
    }

    /**
     * Get User's Claimed Vouchers
     */
    async getMyVouchers(userId) {
        const query = `
            SELECT vc.*, v.title, v.code, v.discount_type, v.discount_value, v.description, v.banner_image, v.subtitle, v.max_discount,
                   v.applicable_to, v.eligible_actions, v.min_transaction,
                   v.expired_at, v.is_new_user_only, v.is_active
            FROM voucher_claims vc
            JOIN vouchers v ON vc.voucher_id = v.id
            WHERE vc.user_id = $1 
            ORDER BY vc.claimed_at DESC
        `;
        try {
            const { rows } = await db.pool.query(query, [userId]);
            console.log(`[VoucherDebug] getMyVouchers for User ${userId}:`, JSON.stringify(rows, null, 2));
            return rows;
        } catch (error) {
            console.error("VoucherService.getMyVouchers Error:", error);
            throw error;
        }
    }

    /**
     * Claim Voucher (Atomic via Redis)
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
        if (voucher.started_at && now < voucher.started_at) throw new Error("Voucher belum dimulai.");
        if (voucher.expired_at && now > voucher.expired_at) throw new Error("Voucher sudah kedaluwarsa.");
        
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
        if (claimCheck.rows.length >= (voucher.max_use_per_user || 1)) {
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
            // Redis error fallback: Cek DB
            if (voucher.quota > 0 && voucher.quota_used >= voucher.quota) {
                throw new Error("Voucher sudah habis.");
            }
        } else if (remaining < 0) {
            // Kembalikan jika ternyata sudah habis
            await redisClient.setWithExpiry(redisKey, '0', 86400 * 30); 
            throw new Error("Voucher sudah habis (kuota penuh).");
        }

        // 5. Simpan Klaim di DB
        try {
            await db.pool.query(
                "INSERT INTO voucher_claims (voucher_id, user_id, status, claimed_at) VALUES ($1, $2, 'claimed', NOW())",
                [voucher.id, userId]
            );
            return { success: true, voucherCode: voucher.code, expired_at: voucher.expired_at };
        } catch (err) {
            // Rollback Redis quota if DB insert fails
            await redisClient.increment(redisKey); 
            throw new Error("Gagal mengklaim voucher. Anda mungkin sudah mengklaimnya.");
        }
    }

    /**
     * Apply Voucher to Invoice
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
            if (parseFloat(subtotal) < parseFloat(claim.min_transaction || 0)) {
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
     * Initialize / Reset Quota in Redis
     */
    async initVoucherQuotaToRedis(voucherId) {
        const vRes = await db.pool.query("SELECT id, quota, quota_used, expired_at FROM vouchers WHERE id = $1", [voucherId]);
        const v = vRes.rows[0];
        if (!v) return;

        const remainingQuota = (v.quota || 999999) - v.quota_used;
        const ttl = v.expired_at ? Math.max(0, Math.floor((new Date(v.expired_at) - new Date()) / 1000)) : 86400 * 30;
        
        await redisClient.setWithExpiry(`voucher:quota:${v.id}`, Math.max(0, remainingQuota).toString(), ttl || 86400 * 7);
    }

    /**
     * Validate Voucher for Cart
     */
    async validateVoucherForCart(userId, voucherCode, cartItems, targetInvoiceId = null) {
        console.log("!!! VOUCHER VALIDATION CALLED !!! Code:", voucherCode);
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
        if (voucher.started_at && now < voucher.started_at) return { eligible: false, discountAmount: 0, message: "Voucher belum dimulai." };
        if (voucher.expired_at && now > voucher.expired_at) return { eligible: false, discountAmount: 0, message: "Voucher sudah kedaluwarsa." };

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

        // 4. Claim Status
        const claimRes = await db.pool.query(
            "SELECT id, status, invoice_id FROM voucher_claims WHERE voucher_id = $1 AND user_id = $2 AND status = 'claimed' AND (invoice_id IS NULL OR invoice_id = $3) ORDER BY (invoice_id = $3) DESC LIMIT 1",
            [voucher.id, userId, targetInvoiceId]
        );
        if (claimRes.rows.length === 0) {
            return { eligible: false, discountAmount: 0, message: "Voucher belum diklaim atau sudah digunakan di invoice lain." };
        }

        // 5. Item-Level Validation
        let eligibleTlds = [];
        let eligibleActions = [];

        try {
            // Ensure we handle both JSONB (object/array) and JSON string from DB
            eligibleTlds = typeof voucher.applicable_to === 'string' ? JSON.parse(voucher.applicable_to || "[]") : (voucher.applicable_to || []);
            eligibleActions = typeof voucher.eligible_actions === 'string' ? JSON.parse(voucher.eligible_actions || "[]") : (voucher.eligible_actions || []);
        } catch (e) {
            console.error("[VoucherService] Error parsing voucher criteria JSON:", e.message);
            // Fallback to empty arrays if parsing fails
            eligibleTlds = Array.isArray(voucher.applicable_to) ? voucher.applicable_to : [];
            eligibleActions = Array.isArray(voucher.eligible_actions) ? voucher.eligible_actions : [];
        }

        const hasCondition = eligibleTlds.length > 0 || (eligibleActions.length > 0 && !eligibleActions.includes('all'));
        let passesItemValidation = !hasCondition;

        if (hasCondition) {
            console.log(`[VoucherDebug] Validating Voucher: ${voucher.code}`);
            console.log(`[VoucherDebug] Eligible TLDs:`, eligibleTlds);
            console.log(`[VoucherDebug] Eligible Actions:`, eligibleActions);

            passesItemValidation = cartItems.some(item => {
                // Normalize TLD comparison (ensure leading dots match)
                const itemTld = (item.tld || "").toLowerCase().startsWith('.') ? item.tld.toLowerCase() : `.${(item.tld || "").toLowerCase()}`;
                
                const tldMatch = eligibleTlds.length === 0 || eligibleTlds.some(vTld => {
                    if (vTld.toLowerCase() === 'all') return true;
                    const normVTld = vTld.toLowerCase().startsWith('.') ? vTld.toLowerCase() : `.${vTld.toLowerCase()}`;
                    return normVTld === itemTld;
                });

                const actionMatch = eligibleActions.length === 0 || eligibleActions.some(act => 
                    act.toLowerCase() === 'all' || act.toLowerCase() === (item.action || "").toLowerCase()
                );

                console.log(`[VoucherDebug] Item: ${item.name}, TLD: ${itemTld}, Action: ${item.action}`);
                console.log(`[VoucherDebug] -> TLD Match: ${tldMatch}, Action Match: ${actionMatch}`);

                return tldMatch && actionMatch;
            });
            console.log(`[VoucherDebug] Final Validation Result: ${passesItemValidation}`);
        }

        if (!passesItemValidation) {
            const tldList = eligibleTlds.length > 0 ? eligibleTlds.join(', ').toUpperCase() : '';
            return { 
                eligible: false, 
                discountAmount: 0, 
                message: tldList ? `Voucher ini hanya berlaku untuk domain: ${tldList}` : "Voucher tidak berlaku untuk item pilihan Anda." 
            };
        }

        // 6. Subtotal
        const subtotal = cartItems.reduce((acc, item) => acc + (parseFloat(item.base_price) * (item.duration || 1)), 0);
        if (subtotal < parseFloat(voucher.min_transaction || 0)) {
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
     * Finalize Voucher Usage (On Payment Success)
     */
    async finalizeVoucherUsage(invoiceId, client = db.pool) {
        try {
            const claimRes = await client.query(
                "SELECT id, voucher_id FROM voucher_claims WHERE invoice_id = $1 AND status = 'claimed' LIMIT 1",
                [invoiceId]
            );

            if (claimRes.rows.length === 0) return; 

            const claim = claimRes.rows[0];

            // 1. Mark as Used
            await client.query(
                "UPDATE voucher_claims SET status = 'used', used_at = NOW() WHERE id = $1",
                [claim.id]
            );

            // 2. Increment Quota Used
            await client.query(
                "UPDATE vouchers SET quota_used = quota_used + 1 WHERE id = $1",
                [claim.voucher_id]
            );

            console.log(`[VoucherService] Finalized usage for Invoice ${invoiceId}, Claim ${claim.id}`);
        } catch (err) {
            console.error(`[VoucherService] Error finalizing usage for Invoice ${invoiceId}:`, err);
        }
    }

    /**
     * Get Detailed Voucher Info by Code
     */
    async getVoucherInfo(code, userId) {
        const query = `
            SELECT id, title, subtitle, description, code, discount_type, discount_value, 
                   min_transaction, max_discount, started_at, expired_at, banner_image,
                   is_new_user_only, applicable_to, eligible_actions
            FROM vouchers 
            WHERE code = $1 AND is_active = true
        `;
        const result = await db.pool.query(query, [code.toUpperCase()]);
        return result.rows[0];
    }

    // ---------------------------------------------------------
    // B. ADMIN METHODS (CRUD)
    // ---------------------------------------------------------

    async getAllVouchers() {
        try {
            const { rows } = await db.pool.query("SELECT * FROM vouchers ORDER BY created_at DESC");
            return rows;
        } catch (error) {
            console.error("VoucherService.getAllVouchers Error:", error);
            throw error;
        }
    }

    async createVoucher(data) {
        const {
            code, title, discount_type, discount_value, quota, 
            max_use_per_user, applicable_to, min_transaction,
            started_at, expired_at, max_discount, is_new_user_only, is_stackable,
            subtitle, banner_image, description, is_automatic, priority, segment,
            eligible_actions, created_by
        } = data;

        const query = `
            INSERT INTO vouchers (
                code, title, discount_type, discount_value, quota,
                max_use_per_user, applicable_to, min_transaction,
                started_at, expired_at, created_by,
                max_discount, is_new_user_only, is_stackable,
                subtitle, banner_image, description, is_automatic, priority, segment,
                eligible_actions, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
            RETURNING *
        `;

        const values = [
            code ? code.toUpperCase() : null, title, discount_type || 'flat', parseFloat(discount_value) || 0, parseInt(quota) || 0,
            parseInt(max_use_per_user) || 1, applicable_to || null, parseFloat(min_transaction) || 0,
            started_at || null, expired_at || null, created_by || null,
            parseFloat(max_discount) || 0, !!is_new_user_only, !!is_stackable,
            subtitle || null, banner_image || null, description || null, 
            !!is_automatic, parseInt(priority) || 0, segment || 'all',
            eligible_actions ? (typeof eligible_actions === 'string' ? eligible_actions : JSON.stringify(eligible_actions)) : '["register"]'
        ];

        try {
            const { rows } = await db.pool.query(query, values);
            const voucher = rows[0];
            // Sync ke Redis
            await this.initVoucherQuotaToRedis(voucher.id);
            return voucher;
        } catch (error) {
            console.error("VoucherService.createVoucher Error:", error);
            if (error.code === '23505') throw new Error("Kode voucher sudah ada.");
            throw error;
        }
    }

    async updateVoucher(id, data) {
        const {
            code, title, discount_type, discount_value, quota, 
            max_use_per_user, applicable_to, min_transaction,
            started_at, expired_at, max_discount, is_new_user_only, is_stackable,
            subtitle, banner_image, description, is_automatic, priority, segment,
            is_active, eligible_actions
        } = data;

        const updateQuery = `
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
        const values = [
            code ? code.toUpperCase() : null, title, discount_type, parseFloat(discount_value) || 0, parseInt(quota) || 0,
            parseInt(max_use_per_user) || 1, applicable_to || null, parseFloat(min_transaction) || 0,
            started_at, expired_at, parseFloat(max_discount) || 0, 
            !!is_new_user_only, !!is_stackable,
            subtitle || null, banner_image || null, description || null,
            !!is_automatic, parseInt(priority) || 0, segment || 'all',
            is_active !== undefined ? is_active : true,
            eligible_actions ? (typeof eligible_actions === 'string' ? eligible_actions : JSON.stringify(eligible_actions)) : '["register"]',
            id
        ];

        try {
            const { rows } = await db.pool.query(updateQuery, values);
            const voucher = rows[0];
            // Resync to Redis
            await this.initVoucherQuotaToRedis(id);
            return voucher;
        } catch (error) {
            console.error("VoucherService.updateVoucher Error:", error);
            throw error;
        }
    }

    async deleteVoucher(id) {
        try {
            await db.pool.query("DELETE FROM vouchers WHERE id = $1", [id]);
            await redisClient.delete(`voucher:quota:${id}`);
            return true;
        } catch (error) {
            console.error("VoucherService.deleteVoucher Error:", error);
            throw error;
        }
    }

    async getAnalytics() {
        try {
            const totalRes = await db.pool.query("SELECT COUNT(*) as count FROM vouchers");
            const activeRes = await db.pool.query("SELECT COUNT(*) as count FROM vouchers WHERE is_active = TRUE");
            const usageRes = await db.pool.query("SELECT SUM(quota_used) as count FROM vouchers");
            const claimsRes = await db.pool.query("SELECT COUNT(*) as count FROM voucher_claims");
            
            return {
                totalVouchers: parseInt(totalRes.rows[0].count),
                activeVouchers: parseInt(activeRes.rows[0].count),
                totalUsage: parseInt(usageRes.rows[0].count || 0),
                totalClaims: parseInt(claimsRes.rows[0].count)
            };
        } catch (error) {
            console.error("VoucherService.getAnalytics Error:", error);
            throw error;
        }
    }
}

module.exports = new VoucherService();
