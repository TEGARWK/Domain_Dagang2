const db = require('../config/db');

/**
 * Mendapatkan provider pembayaran yang sedang aktif.
 * Memeriksa tabel `payment_gateways` dengan urutan prioritas tertentu.
 */
exports.getActiveProvider = async () => {
    try {
        const sql = "SELECT provider FROM payment_gateways WHERE is_active = true";
        const result = await db.pool.query(sql);
        
        let providers = result.rows.map(row => row.provider);
        if (providers.length === 0) return 'tripay'; // Fallback to tripay
        
        // Priority: tripay is ALWAYS first for now as requested
        if (providers.includes('tripay')) return 'tripay';
        if (providers.includes('prismalink')) return 'prismalink';
        
        return providers[0] || 'tripay';
    } catch (err) {
        console.error("❌ Failed to get active provider:", err);
        return 'tripay';
    }
};

/**
 * Menyeragamkan format response hasil inisiasi payment gateway (Prismalink / Tripay)
 * agar frontend tidak crash tanpa harus dirombak besar-besaran.
 */
exports.normalizePaymentResponse = (provider, payload) => {
    if (provider === 'tripay') {
        return {
            provider: 'tripay',
            reference: payload.reference,
            transaction_id: payload.merchant_ref,
            payment_method: payload.payment_method || payload.method,
            pay_code: payload.pay_code,
            pay_url: payload.pay_url || payload.qr_url,
            checkout_url: payload.checkout_url,
            amount: payload.amount,
            expired_at: payload.expired_time,
            qr_string: payload.qr_string || null,
            total_fee: payload.total_fee || 0,
            fee_customer: payload.fee_customer || 0
        };
    } else {
        // Prismalink format (default)
        return {
            provider: 'prismalink',
            reference: payload.plink_ref_no,
            transaction_id: payload.transaction_id,
            payment_method: payload.payment_channel || payload.bank_code,
            pay_code: payload.va_number || payload.qr_string, 
            pay_url: payload.qr_url || null,
            amount: payload.amount,
            expired_at: payload.expired_at,
            qr_string: payload.qr_string || null,
            total_fee: payload.total_fee || payload.fee || 0,
            fee_customer: payload.fee_customer || payload.fee || 0
        };
    }
}
