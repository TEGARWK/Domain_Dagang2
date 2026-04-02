const db = require('../config/db');
const fs = require('fs');

class VoucherService {
    // 1. GET AVAILABLE CLAIMABLE VOUCHERS
    static async getAvailableClaimableVouchers(userId) {
        const query = `
            SELECT * FROM coupons 
            WHERE is_active = TRUE 
            AND is_automatic = FALSE
            AND (usage_limit_total = 0 OR usage_limit_total > used_count)
            AND (valid_until IS NULL OR valid_until > NOW())
            AND id NOT IN (SELECT coupon_id FROM user_vouchers WHERE user_id = $1)
            ORDER BY created_at DESC
        `;
        try {
            const { rows } = await db.pool.query(query, [userId]);
            return rows;
        } catch (error) {
            console.error("VoucherService.getAvailableClaimableVouchers Error:", error);
            throw error;
        }
    }

    // 2. GET USER VOUCHERS
    static async getMyVouchers(userId) {
        const query = `
            SELECT uv.*, v.title, v.code, v.type, v.value, v.description, v.banner_image, v.subtitle, v.max_discount
            FROM user_vouchers uv
            JOIN coupons v ON uv.coupon_id = v.id
            WHERE uv.user_id = $1
            ORDER BY uv.claimed_at DESC
        `;
        try {
            const { rows } = await db.pool.query(query, [userId]);
            return rows;
        } catch (error) {
            console.error("VoucherService.getMyVouchers Error:", error);
            throw error;
        }
    }

    // 3. CLAIM VOUCHER
    static async claimVoucher(userId, voucherId) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Check voucher
            const vRes = await client.query("SELECT * FROM coupons WHERE id = $1 AND is_active = TRUE FOR UPDATE", [voucherId]);
            if (vRes.rows.length === 0) throw new Error("Voucher tidak ditemukan atau tidak aktif.");
            const voucher = vRes.rows[0];

            if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) throw new Error("Voucher sudah kadaluarsa.");
            if (voucher.is_automatic) throw new Error("Voucher otomatis tidak perlu diklaim.");
            if (voucher.usage_limit_total > 0 && voucher.used_count >= voucher.usage_limit_total) throw new Error("Kupon sudah habis.");

            // Check if already claimed
            const cRes = await client.query("SELECT 1 FROM user_vouchers WHERE user_id = $1 AND coupon_id = $2", [userId, voucherId]);
            if (cRes.rows.length > 0) throw new Error("Voucher sudah diklaim.");

            // Insert claim
            await client.query(`
                INSERT INTO user_vouchers (user_id, coupon_id, claimed_at, status)
                VALUES ($1, $2, NOW(), 'claimed')
            `, [userId, voucherId]);

            // Update count
            await client.query("UPDATE coupons SET used_count = used_count + 1 WHERE id = $1", [voucherId]);

            await client.query('COMMIT');
            return { success: true, message: "Voucher berhasil diklaim!" };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // 4. ADMIN: GET ALL VOUCHERS
    static async getAllVouchers() {
        try {
            const { rows } = await db.pool.query("SELECT * FROM coupons ORDER BY created_at DESC");
            return rows;
        } catch (error) {
            console.error("VoucherService.getAllVouchers Error:", error);
            throw error;
        }
    }

    // 5. ADMIN: CREATE VOUCHER
    static async createVoucher(data) {
        // Fallback for debug logging
        try { fs.appendFileSync('creation_debug.log', `[${new Date().toISOString()}] Data: ${JSON.stringify(data)}\n`); } catch(e){}

        const {
            title, code, description, banner_image, subtitle, 
            min_purchase, usage_limit_total, valid_until, 
            eligible_tlds, eligible_actions, is_stackable, is_new_user_only, 
            max_discount, is_active, is_automatic, 
            start_date, end_date, usage_limit_per_user, priority, segment 
        } = data;

        // FIELD MAPPING
        let typeVal = data.type || data.discount_type || 'fixed';
        if (typeVal === 'nominal') typeVal = 'fixed';
        const valueVal = data.value !== undefined ? data.value : (data.discount_value || 0);

        const query = `
            INSERT INTO coupons (
                title, code, description, banner_image, subtitle, type, value, min_purchase, usage_limit_total, valid_until, 
                eligible_tlds, eligible_actions, is_stackable, is_new_user_only, 
                max_discount, is_active, is_automatic,
                start_date, end_date, usage_limit_per_user, priority, segment,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                $11, $12, $13, $14, 
                $15, $16, $17,
                $18, $19, $20, $21, $22,
                NOW(), NOW()
            ) RETURNING *
        `;

        const values = [
            title, 
            code ? code.toUpperCase() : null, 
            description || null, 
            banner_image || null,
            subtitle || null,
            typeVal, 
            parseFloat(valueVal) || 0, 
            parseFloat(min_purchase) || 0, 
            parseInt(usage_limit_total) || 0, 
            valid_until || null, 
            JSON.stringify(eligible_tlds || []), 
            JSON.stringify(eligible_actions || ['register']), 
            !!is_stackable, 
            !!is_new_user_only, 
            parseFloat(max_discount) || 0, 
            is_active !== undefined ? is_active : true, 
            !!is_automatic,
            start_date || null, 
            end_date || null, 
            parseInt(usage_limit_per_user) || 1, 
            parseInt(priority) || 0, 
            segment || 'all'
        ];

        try {
            const { rows } = await db.pool.query(query, values);
            return rows[0];
        } catch (error) {
            try { fs.appendFileSync('creation_debug.log', `[${new Date().toISOString()}] ERROR: ${error.message}\n`); } catch(e){}
            console.error("VoucherService.createVoucher Error:", error);
            if (error.code === '23505') throw new Error("Kode voucher sudah ada.");
            throw error;
        }
    }

    // 6. ADMIN: UPDATE VOUCHER
    static async updateVoucher(id, data) {
        const {
            code, title, description, banner_image, subtitle, type, value, max_discount, min_purchase, usage_limit_total,
            valid_until, is_active, is_automatic, is_stackable,
            is_new_user_only, eligible_tlds, eligible_actions,
            start_date, end_date, usage_limit_per_user, priority, segment
        } = data;
        
        let typeVal = type || data.discount_type || 'fixed';
        if (typeVal === 'nominal') typeVal = 'fixed';
        const valueVal = value !== undefined ? value : (data.discount_value || 0);

        const updateQuery = `
            UPDATE coupons SET
                code = $1, title = $2, description = $3, banner_image = $4, subtitle = $5, type = $6, value = $7, max_discount = $8, 
                min_purchase = $9, usage_limit_total = $10, valid_until = $11, 
                is_active = $12, is_automatic = $13, is_stackable = $14, 
                is_new_user_only = $15, 
                eligible_tlds = $16, eligible_actions = $17,
                start_date = $18, end_date = $19, usage_limit_per_user = $20, 
                priority = $21, segment = $22, updated_at = NOW()
            WHERE id = $23 RETURNING *
        `;
        const values = [
            code ? code.toUpperCase() : null, title, description || null, banner_image || null, subtitle || null, typeVal, parseFloat(valueVal) || 0, parseFloat(max_discount) || 0,
            parseFloat(min_purchase) || 0, parseInt(usage_limit_total) || 0, valid_until || null,
            is_active, is_automatic, is_stackable,
            is_new_user_only,
            JSON.stringify(eligible_tlds || []), JSON.stringify(eligible_actions || ['register']),
            start_date || null, end_date || null, parseInt(usage_limit_per_user) || 1, parseInt(priority) || 0, segment || 'all',
            id
        ];

        try {
            const { rows } = await db.pool.query(updateQuery, values);
            return rows[0];
        } catch (error) {
            console.error("VoucherService.updateVoucher Error:", error);
            throw error;
        }
    }

    // 7. GET PUBLIC VOUCHERS (Promo Page)
    static async getPublicVouchers() {
        const query = `
            SELECT * FROM coupons 
            WHERE is_active = TRUE 
            AND (valid_until IS NULL OR valid_until > NOW())
            AND (start_date IS NULL OR start_date <= NOW())
            AND (end_date IS NULL OR end_date > NOW())
            AND (usage_limit_total = 0 OR usage_limit_total > used_count)
            ORDER BY priority DESC, created_at DESC
        `;
        try {
            const { rows } = await db.pool.query(query);
            return rows;
        } catch (error) {
            console.error("VoucherService.getPublicVouchers Error:", error);
            throw error;
        }
    }

    // 8. GET AVAILABLE AUTO VOUCHERS (With Eligibility Check)
    static async getAvailableAutoVouchers(subtotal = 0, items = []) {
        const query = `
            SELECT * FROM promo_events 
            WHERE is_automatic = TRUE 
            AND is_active = TRUE
            AND (start_date IS NULL OR start_date <= NOW())
            AND (COALESCE(end_date, valid_until) IS NULL OR COALESCE(end_date, valid_until) > NOW())
            AND min_purchase <= $1
            ORDER BY priority DESC, created_at ASC
        `;
        try {
            const { rows } = await db.pool.query(query, [subtotal]);
            
            // Filter by TLD eligibility if items are provided
            if (items.length > 0) {
                return rows.filter(v => {
                    const tlds = typeof v.eligible_tlds === 'string' ? JSON.parse(v.eligible_tlds) : v.eligible_tlds;
                    const actions = typeof v.eligible_actions === 'string' ? JSON.parse(v.eligible_actions) : v.eligible_actions;
                    
                    const tldMatchAll = !tlds || tlds.length === 0 || tlds.includes('all');
                    const actionMatchAll = !actions || actions.length === 0 || actions.includes('all');

                    if (tldMatchAll && actionMatchAll) return true;
                    
                    // Check if any item matches the eligible TLDs AND Actions
                    return items.some(item => {
                        const tld = '.' + item.name.split('.').slice(1).join('.');
                        const tldMatch = tldMatchAll || tlds.includes(tld);
                        const actionMatch = actionMatchAll || actions.includes(item.action || 'register');
                        return tldMatch && actionMatch;
                    });
                });
            }
            return rows;
        } catch (error) {
            console.error("VoucherService.getAvailableAutoVouchers Error:", error);
            throw error;
        }
    }

    // 9. CALCULATE BEST DISCOUNT
    static async calculateBestDiscount({ userId, subtotal, items, userVoucherId = null }) {
        try {
            // A. Find Best Auto Promo
            const autos = await this.getAvailableAutoVouchers(subtotal, items);
            let bestAuto = null;
            let maxAutoDiscount = 0;

            for (const promo of autos) {
                // Determine eligible amount for this promo (TLD + Action)
                const tlds = typeof promo.eligible_tlds === 'string' ? JSON.parse(promo.eligible_tlds) : promo.eligible_tlds;
                const actions = typeof promo.eligible_actions === 'string' ? JSON.parse(promo.eligible_actions) : promo.eligible_actions;
                
                const tldAll = !tlds || tlds.length === 0 || tlds.includes('all');
                const actionAll = !actions || actions.length === 0 || actions.includes('all');
                
                const eligibleAmount = items.reduce((sum, item) => {
                    const tld = '.' + item.name.split('.').slice(1).join('.');
                    const tldMatch = tldAll || tlds.includes(tld);
                    const actionMatch = actionAll || actions.includes(item.action || 'register');

                    if (tldMatch && actionMatch) {
                        return sum + (item.price * (item.period || 1));
                    }
                    return sum;
                }, 0);

                let disc = 0;
                if (promo.type === 'percentage') {
                    disc = eligibleAmount * (parseFloat(promo.value) / 100);
                    if (promo.max_discount > 0) disc = Math.min(disc, parseFloat(promo.max_discount));
                } else {
                    disc = parseFloat(promo.value);
                }

                if (disc > maxAutoDiscount) {
                    maxAutoDiscount = disc;
                    bestAuto = promo;
                }
            }

            // B. Check Manual Voucher (if provided)
            let manualDiscount = 0;
            let appliedManual = null;

            if (userVoucherId) {
                const uvRes = await db.pool.query(`
                    SELECT uv.*, v.* 
                    FROM user_vouchers uv 
                    JOIN coupons v ON uv.coupon_id = v.id 
                    WHERE uv.id = $1 AND uv.user_id = $2 AND uv.status = 'claimed'
                `, [userVoucherId, userId]);

                if (uvRes.rows.length > 0) {
                    const v = uvRes.rows[0];
                    // Basic validation
                    const validDate = (!v.valid_until || new Date(v.valid_until) > new Date());
                    const validMin = subtotal >= parseFloat(v.min_purchase);

                    if (validDate && validMin) {
                        if (v.is_stackable || !bestAuto) {
                            // Check TLD and Action Eligibility at Item Level
                            const tlds = typeof v.eligible_tlds === 'string' ? JSON.parse(v.eligible_tlds) : v.eligible_tlds;
                            const actions = typeof v.eligible_actions === 'string' ? JSON.parse(v.eligible_actions) : v.eligible_actions;
                            
                            const tldAll = !tlds || tlds.length === 0 || tlds.includes('all');
                            const actionAll = !actions || actions.length === 0 || actions.includes('all');

                            const eligibleAmount = items.reduce((sum, item) => {
                                const tld = '.' + item.name.split('.').slice(1).join('.');
                                const tldMatch = tldAll || tlds.includes(tld);
                                const actionMatch = actionAll || actions.includes(item.action || 'register');

                                if (tldMatch && actionMatch) {
                                    return sum + (item.price * (item.period || 1));
                                }
                                return sum;
                            }, 0);

                            if (eligibleAmount > 0) {
                                if (v.type === 'percentage') {
                                    manualDiscount = eligibleAmount * (parseFloat(v.value) / 100);
                                    if (v.max_discount > 0) manualDiscount = Math.min(manualDiscount, parseFloat(v.max_discount));
                                } else {
                                    manualDiscount = parseFloat(v.value);
                                }
                                appliedManual = v;
                            }
                        }
                    }
                }
            }

            return {
                autoDiscount: Math.floor(maxAutoDiscount),
                manualDiscount: Math.floor(manualDiscount),
                totalDiscount: Math.floor(maxAutoDiscount + manualDiscount),
                bestAuto,
                appliedManual
            };
        } catch (error) {
            console.error("VoucherService.calculateBestDiscount Error:", error);
            throw error;
        }
    }

    // 10. DELETE VOUCHER
    static async deleteVoucher(id) {
        try {
            await db.pool.query("DELETE FROM coupons WHERE id = $1", [id]);
            return true;
        } catch (error) {
            console.error("VoucherService.deleteVoucher Error:", error);
            throw error;
        }
    }

    // 11. GET ANALYTICS
    static async getAnalytics() {
        try {
            const total = await db.pool.query("SELECT COUNT(*) as count FROM coupons");
            const active = await db.pool.query("SELECT COUNT(*) as count FROM coupons WHERE is_active = TRUE");
            const usage = await db.pool.query("SELECT SUM(used_count) as count FROM coupons");
            const claims = await db.pool.query("SELECT COUNT(*) as count FROM user_vouchers");

            return {
                totalVouchers: parseInt(total.rows[0].count),
                activeVouchers: parseInt(active.rows[0].count),
                totalRedemptions: parseInt(usage.rows[0].count) || 0,
                totalClaims: parseInt(claims.rows[0].count) || 0
            };
        } catch (error) {
            console.error("VoucherService.getAnalytics Error:", error);
            throw error;
        }
    }
}

module.exports = VoucherService;
