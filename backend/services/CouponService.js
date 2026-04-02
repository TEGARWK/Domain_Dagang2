const db = require('../config/db');

class CouponService {

    /**
     * Validate Coupon for a Cart (Dry Run)
     * Checks: Expiry, Quota (soft), Min Purchase, Stacking Rules
     */
    static async validateCoupon(code, userId, cartItems, subtotal, hasPromoEvent = false) {
        if (!code) return { valid: false, reason: "Kode kupon wajib diisi" };

        const query = `
            SELECT 
                id, code, title, type as discount_type, value as discount_value, 
                max_discount as max_discount_amount, min_purchase as min_purchase_amount, 
                usage_limit_total as usage_limit_global, usage_limit_per_user, used_count, locked_count,
                valid_until as expires_at, is_stackable, is_automatic, is_active,
                start_date, valid_until
            FROM coupons
            WHERE code = $1 
            AND is_active = TRUE
            AND (start_date IS NULL OR start_date <= NOW())
            AND (valid_until IS NULL OR valid_until > NOW())
        `;
        
        try {
            const { rows } = await db.pool.query(query, [code.toUpperCase()]);
            if (rows.length === 0) return { valid: false, reason: "Kupon tidak ditemukan atau sudah kadaluarsa" };
            
            const coupon = rows[0];

            if (coupon.is_automatic) return { valid: false, reason: "Kupon otomatis tidak perlu diinput manual" };

            // 1. Check Global Quota (Soft Check)
            if (coupon.usage_limit_global > 0) {
                const effectiveUsed = (coupon.used_count || 0) + (coupon.locked_count || 0);
                if (effectiveUsed >= coupon.usage_limit_global) {
                    return { valid: false, reason: "Kuota kupon habis" };
                }
            }

            // 2. Check User Quota
            if (userId && coupon.usage_limit_per_user > 0) {
                const userUsageRes = await db.pool.query(`
                    SELECT COUNT(*) as count FROM coupon_reservations 
                    WHERE user_id = $1 AND coupon_id = $2 
                    AND status IN ('LOCKED', 'USED')
                `, [userId, coupon.id]);
                
                if (parseInt(userUsageRes.rows[0].count) >= coupon.usage_limit_per_user) {
                    return { valid: false, reason: "Anda sudah mencapai batas penggunaan kupon ini" };
                }
            }

            // 3. Check Minimum Purchase
            if (subtotal < parseFloat(coupon.min_purchase_amount)) {
                return { valid: false, reason: `Minimal belanja Rp ${parseFloat(coupon.min_purchase_amount).toLocaleString()}` };
            }

            // 4. Check Stacking Rules (Anti-Gravity)
            if (!coupon.is_stackable && hasPromoEvent) {
                return { valid: false, reason: "Kupon ini tidak dapat digabung dengan Promo Event." };
            }

            // 5. Calculate Potential Discount
            let discountAmount = 0;
            if (coupon.discount_type === 'percentage') {
                discountAmount = subtotal * (parseFloat(coupon.discount_value) / 100);
                if (coupon.max_discount_amount > 0) {
                    discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount));
                }
            } else {
                discountAmount = parseFloat(coupon.discount_value);
            }
            
            discountAmount = Math.min(discountAmount, subtotal);

            return {
                valid: true,
                coupon,
                discountAmount
            };

        } catch (error) {
            console.error("CouponService.validateCoupon Error:", error);
            throw error;
        }
    }

    /**
     * Reserve Coupon (Atomic Lock)
     */
    static async reserveCoupon(code, userId, invoiceId, client) {
        const updateQuery = `
            UPDATE coupons 
            SET locked_count = locked_count + 1 
            WHERE code = $1 
            AND is_active = TRUE
            AND is_automatic = FALSE
            AND (start_date IS NULL OR start_date <= NOW())
            AND (valid_until IS NULL OR valid_until > NOW())
            AND (usage_limit_total = 0 OR (used_count + locked_count) < usage_limit_total)
            RETURNING id, type, value, max_discount
        `;
        
        const { rows } = await client.query(updateQuery, [code.toUpperCase()]);
        
        if (rows.length === 0) {
            throw new Error("Gagal memproses kupon: Habis atau kadaluarsa saat checkout.");
        }
        
        const coupon = rows[0];

        // Map for invoice process
        return {
            id: coupon.id,
            discount_type: coupon.type,
            discount_value: coupon.value,
            max_discount_amount: coupon.max_discount
        };
    }

    /**
     * Finalize Coupon Usage
     */
    static async finalizeCouponUsage(invoiceId, isSuccess) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Get Reservation (check coupon_reservations table - if exists)
            const resChk = await client.query("SELECT * FROM coupon_reservations WHERE invoice_id = $1", [invoiceId]);
            if (resChk.rows.length === 0) {
                await client.query('ROLLBACK');
                return;
            }
            const reservation = resChk.rows[0];

            if (reservation.status !== 'LOCKED') {
                await client.query('ROLLBACK');
                return;
            }

            if (isSuccess) {
                await client.query(`
                    UPDATE coupons 
                    SET locked_count = locked_count - 1, used_count = used_count + 1 
                    WHERE id = $1
                `, [reservation.coupon_id]);
                
                await client.query(`UPDATE coupon_reservations SET status = 'USED' WHERE invoice_id = $1`, [invoiceId]);
            } else {
                await client.query(`
                    UPDATE coupons 
                    SET locked_count = locked_count - 1 
                    WHERE id = $1
                `, [reservation.coupon_id]);
                
                await client.query(`UPDATE coupon_reservations SET status = 'CANCELLED' WHERE invoice_id = $1`, [invoiceId]);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("CouponService.finalizeCouponUsage Error:", error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get Available Coupons for User
     */
    static async getAvailableCoupons(userId) {
        const query = `
            SELECT 
                id, code, title, type as discount_type, value as discount_value, 
                min_purchase as min_purchase_amount, 
                usage_limit_total as usage_limit_global, usage_limit_per_user, used_count, locked_count,
                valid_until as expires_at, is_stackable
            FROM coupons
            WHERE is_active = TRUE
            AND is_automatic = FALSE
            AND (start_date IS NULL OR start_date <= NOW())
            AND (valid_until IS NULL OR valid_until > NOW())
            AND (usage_limit_total = 0 OR (used_count + locked_count) < usage_limit_total)
            ORDER BY created_at DESC
        `;
        
        try {
            const { rows } = await db.pool.query(query);

            const available = [];
            for (const coupon of rows) {
                if (userId && coupon.usage_limit_per_user > 0) {
                    const userUsageRes = await db.pool.query(`
                        SELECT COUNT(*) as count FROM coupon_reservations 
                        WHERE user_id = $1 AND coupon_id = $2 
                        AND status IN ('LOCKED', 'USED')
                    `, [userId, coupon.id]);
                    
                    if (parseInt(userUsageRes.rows[0].count) >= coupon.usage_limit_per_user) {
                        continue;
                    }
                }
                available.push(coupon);
            }
            return available;
        } catch (error) {
            console.error("CouponService.getAvailableCoupons Error:", error);
            throw error;
        }
    }
}

module.exports = CouponService;
