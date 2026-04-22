const db = require('../config/db');

/**
 * DISCOUNT SERVICE
 * Logic modular untuk menangani perhitungan diskon, validasi kelayakan,
 * dan persistensi diskon ke database (invoices).
 */

class DiscountService {
    /**
     * A. Calculate Discount
     * @param {number} originalPrice 
     * @param {string} discountType 'percentage' | 'flat'
     * @param {number} discountValue 
     * @returns {object} { originalPrice, discountAmount, finalPrice }
     */
    calculateDiscount(originalPrice, discountType, discountValue, maxDiscount = 0) {
        let discountAmount = 0;

        if (discountType === 'percentage') {
            discountAmount = Math.floor(originalPrice * (discountValue / 100));
            // Apply cap for percentage discounts
            if (maxDiscount > 0 && discountAmount > maxDiscount) {
                discountAmount = maxDiscount;
            }
        } else if (discountType === 'flat' || discountType === 'nominal') {
            discountAmount = discountValue;
        }

        // Validasi: Diskon tidak boleh melebihi harga original
        if (discountAmount > originalPrice) {
            discountAmount = originalPrice;
        }

        const finalPrice = Math.max(0, originalPrice - discountAmount);

        return {
            originalPrice,
            discountAmount,
            finalPrice
        };
    }

    /**
     * B. Apply Discount to Invoice
     * Updates invoices table with standardized discount metadata.
     * @param {number|string} invoiceId 
     * @param {object} discountData { original_subtotal, discount_amount, discount_source, meta }
     * @param {object} dbClient Optional - Client for transaction
     */
    async applyDiscountToInvoice(invoiceId, discountData, dbClient = null) {
        const client = dbClient || await db.pool.connect();
        const shouldRelease = !dbClient;

        try {
            if (shouldRelease) await client.query('BEGIN');

            const { original_subtotal, discount_amount, discount_source, meta } = discountData;

            const query = `
                UPDATE invoices 
                SET original_subtotal = $1,
                    discount_amount = $2,
                    discount_source = $3,
                    discount_meta = $4,
                    updated_at = NOW()
                WHERE id = $5
            `;

            await client.query(query, [
                original_subtotal,
                discount_amount,
                discount_source,
                JSON.stringify(meta),
                invoiceId
            ]);

            if (shouldRelease) await client.query('COMMIT');
            return { success: true };
        } catch (err) {
            if (shouldRelease) await client.query('ROLLBACK');
            console.error('[DiscountService] applyDiscountToInvoice Failed:', err.message);
            throw err;
        } finally {
            if (shouldRelease) client.release();
        }
    }

    /**
     * C. Validate Discount Eligibility
     * Cek apakah user berhak mendapatkan diskon (bebas double-claim pada transaksi aktif)
     * @param {number} userId 
     * @param {string} discountSource 'voucher' | 'referral'
     * @returns {object} { eligible: boolean, reason: string }
     */
    async validateDiscountEligibility(userId, discountSource) {
        // Cek apakah ada invoice PENDING milik user yang sudah menggunakan source diskon ini
        const query = `
            SELECT id FROM invoices 
            WHERE user_id = $1 
            AND status = 'pending' 
            AND discount_source LIKE $2
            LIMIT 1
        `;

        try {
            const res = await db.pool.query(query, [userId, `%${discountSource}%`]);
            
            if (res.rows.length > 0) {
                return { 
                    eligible: false, 
                    reason: `Anda sudah memiliki transaksi pending yang menggunakan ${discountSource}.` 
                };
            }

            return { eligible: true, reason: 'Eligible' };
        } catch (err) {
            console.error('[DiscountService] validateDiscountEligibility Error:', err.message);
            return { eligible: false, reason: 'Terjadi kesalahan sistem saat validasi.' };
        }
    }
}

module.exports = new DiscountService();
