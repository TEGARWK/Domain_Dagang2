const crypto = require('crypto');
const axios = require('axios');
const db = require('../config/db');

class PrismalinkService {
    async getConfig() {
        try {
            const res = await db.pool.query("SELECT * FROM payment_gateways WHERE provider ILIKE 'prismalink' LIMIT 1");
            if (res.rows.length > 0) {
                const raw = res.rows[0];
                const isSandbox = (raw.mode || 'sandbox').toLowerCase() !== 'production';
                const defaultUrl = isSandbox 
                    ? "https://api-staging.plink.co.id/gateway/v2" 
                    : "https://api3.plink.co.id/gateway/v2";

                return {
                    key_id: (raw.api_key || "").trim(),
                    merchant_id: (raw.merchant_code || "").trim(),
                    secret_key: (raw.private_key || "").trim(),
                    backend_callback: (raw.webhook_url || "").trim(),
                    frontend_callback: (raw.frontend_callback || "").trim(),
                    baseUrl: raw.api_url || defaultUrl
                };
            }
            return null;
        } catch (err) {
            console.error('[PrismalinkService] getConfig error:', err.message);
            return null;
        }
    }

    generateSignature(bodyString, secretKey) {
        return crypto.createHmac('sha256', secretKey)
                     .update(bodyString)
                     .digest('hex')
                     .toUpperCase();
    }

    async createTransaction(orderData, userIp = "127.0.0.1") {
        try {
            const config = await this.getConfig();
            if (!config || !config.secret_key) {
                return { success: false, error: "Konfigurasi Prismalink belum lengkap" };
            }

            // 1. Format Waktu (WAJIB: yyyy-MM-dd HH:mm:ss.SSS +0700)
            const now = new Date();
            const dateStr = now.getFullYear() + "-" + 
                            String(now.getMonth() + 1).padStart(2, '0') + "-" + 
                            String(now.getDate()).padStart(2, '0');
            const timeStr = String(now.getHours()).padStart(2, '0') + ":" + 
                            String(now.getMinutes()).padStart(2, '0') + ":" + 
                            String(now.getSeconds()).padStart(2, '0') + "." + 
                            String(now.getMilliseconds()).padStart(3, '0');
            const timestamp = `${dateStr} ${timeStr} +0700`; 
            
            // 2. Mapping Method & Channel
            const bankMapping = {
                "014": "BCA",
                "008": "MANDIRI",
                "009": "BNI",
                "002": "BRI",
                "013": "PERMATA",
                "011": "DANAMON",
                "451": "BSI",
                "022": "CIMB",
                "BCA": "BCA",
                "MANDIRI": "MANDIRI",
                "BNI": "BNI",
                "BRI": "BRI"
            };

            let pMethod = "VA";
            let rawChannel = orderData.payment_method || "008"; 
            let bId = bankMapping[rawChannel] || rawChannel;
            
            if (rawChannel === 'QR' || rawChannel === 'QRIS' || rawChannel === '04' || rawChannel === '93600') {
                pMethod = "QR"; 
                bId = "QRIS"; // Prismalink biasanya minta QRIS untuk channel QR
            }

            let phone = String(orderData.customer_phone || "08123456789").trim().replace(/[^0-9]/g, '');
            if (phone.startsWith('0')) {
                phone = '62' + phone.substring(1);
            }
            phone = '+' + phone;

            // Samakan Ref No dengan format Postman (Testing-trx...)
            // Gunakan ID Invoice asli yang dibersihkan karakter anehnya (Maks 30 karakter)
            const trxRef = orderData.order_id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);

            const productDetails = (orderData.items || []).map((item, index) => ({
                item_code: index + 1, // Integer (PENTING!)
                item_title: (item.item_title || "Product").substring(0, 50),
                quantity: item.quantity || 1,
                total: String(Math.floor(parseFloat(item.total))),
                currency: "IDR"
            }));

            if (productDetails.length === 0) {
                productDetails.push({
                    item_code: 1, // Integer
                    item_title: (orderData.description || "Product Payment").substring(0, 50),
                    quantity: 1,
                    total: String(Math.floor(parseFloat(orderData.amount))),
                    currency: "IDR"
                });
            }

            // 3. Build Payload (Strictly following PDF/Postman Collection)
            const payload = {
                merchant_key_id: config.key_id,
                merchant_id: config.merchant_id,
                merchant_ref_no: trxRef,
                backend_callback_url: config.backend_callback,
                frontend_callback_url: config.frontend_callback,
                transaction_date_time: timestamp,
                transmission_date_time: timestamp,
                transaction_currency: "IDR",
                transaction_amount: parseInt(orderData.amount),
                product_details: JSON.stringify(productDetails), 
                user_id: String(orderData.customer_id).substring(0, 20),
                user_name: (orderData.customer_name || "Customer").substring(0, 50),
                user_email: (orderData.customer_email || "customer@mail.com").substring(0, 100),
                user_phone_number: phone,
                remarks: "Payment " + trxRef,
                user_device_id: String(Date.now()).substring(0, 15),
                user_ip_address: (userIp === '::1' || userIp === '127.0.0.1' || userIp.includes('127.0.0.1')) ? '114.124.0.1' : userIp,
                payment_method: pMethod,
                invoice_number: trxRef,
                integration_type: "02", // Selalu gunakan '02' (API Direct) agar dapet raw data VA/QRIS
                external_id: trxRef
            };

            // Tambahkan field khusus VA jika metodenya VA
            if (pMethod === 'VA') {
                payload.payment_channel = bId;
                payload.va_name = (orderData.customer_name || "Customer").replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
                payload.shipping_details = JSON.stringify({ 
                    address: "Digital Product", 
                    telephoneNumber: phone, 
                    handphoneNumber: phone 
                });
            }

            // 4. Generate MAC dari RAW Body String (Compact)
            const bodyString = JSON.stringify(payload);
            const mac = this.generateSignature(bodyString, config.secret_key);
            
            console.log('[Prismalink] Payload:', bodyString);
            console.log('[Prismalink] MAC:', mac);

            try {
                const response = await axios.post(
                    `${config.baseUrl}/payment/integration/transaction/api/submit-trx`,
                    bodyString, 
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                            "mac": mac
                        }
                    }
                );

                if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
                    return { success: false, error: "Server Pembayaran sedang maintenance." };
                }

                const resCode = String(response.data?.response_code || "");
                const resMsg = String(response.data?.response_message || "").toUpperCase();
                
                if (resCode === "PL000" || resMsg === "SUCCESS") {
                    console.log('✅ [Prismalink] Success Response:', JSON.stringify(response.data));
                    return { success: true, data: response.data };
                } else {
                    return { 
                        success: false, 
                        error: response.data?.response_message || response.data?.response_description || "API Error",
                        data: response.data
                    };
                }
            } catch (axiosErr) {
                const errorData = axiosErr.response?.data;
                console.error('[Prismalink] API Request Failed:', errorData || axiosErr.message);
                if (errorData) return { success: false, error: errorData };
                throw axiosErr;
            }

        } catch (err) {
            console.error('[PrismalinkService] createTransaction Fatal Error:', err.message);
            return { success: false, error: err.message };
        }
    }

    async verifyWebhook(rawBody, incomingMac) {
        const config = await this.getConfig();
        if (!config || !config.secret_key || !incomingMac) return false;
        const bodyString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
        const computedMac = this.generateSignature(bodyString, config.secret_key);
        return (computedMac.toLowerCase() === incomingMac.toLowerCase());
    }
}

module.exports = new PrismalinkService();
