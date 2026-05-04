const crypto = require('crypto');
const axios = require('axios');
// --- DB ACCESS HELPER ---
const getDbConfig = async () => {
    try {
        const db = require('../config/db');
        const res = await db.pool.query("SELECT * FROM payment_gateways WHERE provider = 'tripay' LIMIT 1");
        if (res.rows.length > 0) {
            const row = res.rows[0];
            return {
                merchant_code: (row.merchant_code || "").trim(),
                api_key:       (row.api_key       || "").trim(),
                private_key:   (row.private_key   || "").trim(),
                base_url:      row.mode === 'production' 
                    ? 'https://tripay.co.id/api/' 
                    : 'https://tripay.co.id/api-sandbox/'
            };
        }
    } catch (err) {
        console.error('[TripayService] Failed to fetch DB config:', err.message);
    }
    return null; 
};

/**
 * Generate / Validasi Callback Signature dari webhook Tripay.
 * Formula: HMAC-SHA256(JSON.stringify(body), private_key)
 */
const generateCallbackSignature = async (body) => {
    const activeConfig = await getDbConfig();
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const signature = crypto
        .createHmac('sha256', activeConfig.private_key)
        .update(payload)
        .digest('hex');
    
    // Low-level debug log (commented out for performance)
    // console.log(`[Tripay Debug] Payload: ${payload} | Key: ${activeConfig.private_key.substring(0,5)}... | Sig: ${signature}`);
    
    return signature;
};

/**
 * Helper: Buat header Authorization untuk semua request ke Tripay API.
 */
const getHeaders = (apiKey) => ({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
});

/**
 * Helper: Cek apakah response Tripay dianggap sukses.
 * Tripay dapat mereturn HTTP 200 meskipun transaksi gagal (success: false di body).
 * Selalu periksa field `success` di body, BUKAN HTTP status code.
 */
const filterResponseBySuccess = (response) => {
    return response.data?.success === true;
};

// ─────────────────────────────────────────────
//  API METHODS
// ─────────────────────────────────────────────

/**
 * Ambil daftar channel pembayaran yang tersedia dari Tripay.
 */
const getPaymentChannels = async () => {
    try {
        const activeConfig = await getDbConfig();
        const url = `${activeConfig.base_url}merchant/payment-channel`;
        const response = await axios.get(url, { headers: getHeaders(activeConfig.api_key) });
        return { success: true, data: response.data.data };
    } catch (error) {
        console.error('[TripayService] getPaymentChannels Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

/**
 * Buat transaksi Closed Payment (jumlah tetap, berbatas waktu).
 */
const createClosedTransaction = async (payload) => {
    try {
        const activeConfig = await getDbConfig();
        
        // Generate signature menggunakan merchant_ref dan amount dari payload
        const signatureString = `${activeConfig.merchant_code}${payload.merchant_ref}${payload.amount}`;
        const signature = crypto.createHmac('sha256', activeConfig.private_key).update(signatureString).digest('hex');

        const data = { ...payload, signature };

        // Hapus field yang tidak dikenali Tripay
        delete data.return_url; 

        const url = `${activeConfig.base_url}transaction/create`;
        const response = await axios.post(url, data, { headers: getHeaders(activeConfig.api_key) });

        const success = filterResponseBySuccess(response);
        return { success, data: response.data };
    } catch (error) {
        const errData = error.response?.data;
        console.error('[TripayService] ❌ createClosedTransaction Error:', errData || error.message);
        return {
            success: false,
            raw: errData,
            message: errData?.message || error.message,
        };
    }
};

/**
 * Buat transaksi Open Payment.
 */
const createOpenTransaction = async (payload) => {
    try {
        const activeConfig = await getDbConfig();
        const signatureString = `${activeConfig.merchant_code}${payload.method}${payload.merchant_ref}`;
        const signature = crypto.createHmac('sha256', activeConfig.private_key).update(signatureString).digest('hex');
        
        const data = { ...payload, signature };
        const url = `${activeConfig.base_url}open-payment/create`;

        const response = await axios.post(url, data, { headers: getHeaders(activeConfig.api_key) });
        return { success: filterResponseBySuccess(response), data: response.data };
    } catch (error) {
        console.error('[TripayService] ❌ createOpenTransaction Error:', error.response?.data || error.message);
        return {
            success: false,
            raw: error.response?.data,
            message: error.message,
        };
    }
};

/**
 * Cek status transaksi Closed Payment berdasarkan reference Tripay.
 */
const checkTransactionStatus = async (reference) => {
    try {
        const activeConfig = await getDbConfig();
        const url = `${activeConfig.base_url}transaction/detail`;
        const response = await axios.get(url, {
            params: { reference },
            headers: getHeaders(activeConfig.api_key),
        });
        return {
            success: filterResponseBySuccess(response),
            data: response.data.data || response.data,
        };
    } catch (error) {
        console.error('[TripayService] ❌ checkTransactionStatus Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

/**
 * Ambil detail Open Payment berdasarkan UUID.
 */
const getOpenPaymentDetail = async (uuid) => {
    try {
        const activeConfig = await getDbConfig();
        const url = `${activeConfig.base_url}open-payment/${uuid}/detail`;
        const response = await axios.get(url, { headers: getHeaders(activeConfig.api_key) });
        return {
            success: filterResponseBySuccess(response),
            data: response.data.data || response.data,
        };
    } catch (error) {
        console.error('[TripayService] ❌ getOpenPaymentDetail Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

/**
 * Ambil daftar transaksi pada Open Payment tertentu.
 */
const getOpenPaymentTransactions = async (uuid) => {
    try {
        const activeConfig = await getDbConfig();
        const url = `${activeConfig.base_url}open-payment/${uuid}/transactions`;
        const response = await axios.get(url, { headers: getHeaders(activeConfig.api_key) });
        return {
            success: filterResponseBySuccess(response),
            data: response.data.data || response.data,
        };
    } catch (error) {
        console.error('[TripayService] ❌ getOpenPaymentTransactions Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

/**
 * Hitung biaya layanan (fee) untuk channel dan jumlah tertentu.
 */
const getFeeCalculation = async (channelCode, amount) => {
    try {
        const activeConfig = await getDbConfig();
        const url = `${activeConfig.base_url}merchant/fee-calculator`;
        const response = await axios.get(url, {
            params: { code: channelCode, amount },
            headers: getHeaders(activeConfig.api_key),
        });

        const data = response.data.data;
        return { success: true, data: Array.isArray(data) ? data[0] : data };
    } catch (error) {
        console.error('[TripayService] ❌ getFeeCalculation Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

/**
 * Ambil Saldo Merchant dari Tripay.
 */
const getMerchantBalance = async () => {
    try {
        const activeConfig = await getDbConfig();
        const url = `${activeConfig.base_url}merchant/balance`;
        const response = await axios.get(url, { headers: getHeaders(activeConfig.api_key) });
        
        if (response.data?.success) {
            return { success: true, data: response.data.data };
        }
        return { success: false, message: response.data?.message || 'Gagal mengambil saldo' };
    } catch (error) {
        console.error('[TripayService] ❌ getMerchantBalance Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

// ─────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────
module.exports = {
    generateCallbackSignature,
    getPaymentChannels,
    createClosedTransaction,
    createOpenTransaction,
    checkTransactionStatus,
    getOpenPaymentDetail,
    getOpenPaymentTransactions,
    getFeeCalculation,
    getMerchantBalance,
};
