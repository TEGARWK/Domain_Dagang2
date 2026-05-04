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

            const now = new Date();
            const dateStr = now.getFullYear() + "-" + 
                            String(now.getMonth() + 1).padStart(2, '0') + "-" + 
                            String(now.getDate()).padStart(2, '0');
            const timeStr = String(now.getHours()).padStart(2, '0') + ":" + 
                            String(now.getMinutes()).padStart(2, '0') + ":" + 
                            String(now.getSeconds()).padStart(2, '0') + "." + 
                            String(now.getMilliseconds()).padStart(3, '0');
            const timestamp = `${dateStr} ${timeStr} +0700`;
            
            let pMethod = "VA";
            let bId = orderData.payment_method || "008"; 
            
            if (bId === 'QR' || bId === 'QRIS' || bId === '04') {
                pMethod = "QR"; 
                bId = "";
            } else if (bId === 'CC') {
                pMethod = "CC";
            }

            let phone = String(orderData.customer_phone || "08123456789").trim().replace(/[^0-9]/g, '');
            if (phone.startsWith('0')) {
                phone = '62' + phone.substring(1);
            }
            phone = '+' + phone;

            const productDetails = (orderData.items || []).map((item, index) => ({
                item_code: index + 1,
                item_title: item.item_title || "Digital Product",
                quantity: item.quantity || 1,
                total: String(item.total),
                currency: "IDR"
            }));

            if (productDetails.length === 0) {
                productDetails.push({
                    item_code: orderData.order_id,
                    item_title: orderData.description || "Product Payment",
                    quantity: 1,
                    total: String(orderData.amount),
                    currency: "IDR"
                });
            }

            const payload = {
                merchant_key_id: config.key_id,
                merchant_id: config.merchant_id,
                merchant_ref_no: orderData.order_id.replace(/[^a-zA-Z0-9]/g, ''),
                backend_callback_url: config.backend_callback || "https://your-api.com/webhook",
                frontend_callback_url: config.frontend_callback || "https://your-site.com/billing",
                transaction_date_time: timestamp,
                transmission_date_time: timestamp,
                transaction_currency: "IDR",
                transaction_amount: parseInt(orderData.amount),
                product_details: JSON.stringify(productDetails), 
                user_id: String(orderData.customer_id),
                user_name: orderData.customer_name || "Customer",
                user_email: orderData.customer_email || "customer@mail.com",
                user_phone_number: phone,
                remarks: (orderData.description || "Payment").replace(/[^a-zA-Z0-9]/g, '').substring(0, 30),
                user_device_id: "WEB" + String(Date.now()).substring(0, 8),
                user_ip_address: (userIp === '::1' || userIp === '127.0.0.1' || userIp.includes('127.0.0.1')) ? '127.0.0.1' : userIp,
                shipping_details: JSON.stringify({ 
                    address: "Digital Product", 
                    telephoneNumber: phone, 
                    handphoneNumber: phone 
                }), 
                payment_method: pMethod,
                invoice_number: orderData.order_id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16),
                integration_type: "02",
                external_id: orderData.order_id.replace(/[^a-zA-Z0-9]/g, ''),
                va_name: (orderData.customer_name || "Customer").replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)
            };

            console.log('[Prismalink] Payload:', JSON.stringify(payload, null, 2));

            const bodyString = JSON.stringify(payload);
            const mac = this.generateSignature(bodyString, config.secret_key);
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

                const resCode = String(response.data?.response_code || "");
                const resMsg = String(response.data?.response_message || "").toUpperCase();
                
                if (resCode === "PL000" || resMsg === "SUCCESS") {
                    return { success: true, data: response.data };
                } else {
                    return { 
                        success: false, 
                        error: response.data?.response_message || response.data?.response_description || "API Error",
                        data: response.data
                    };
                }
            } catch (axiosErr) {
                console.error('[Prismalink] API Request Failed:', axiosErr.response?.data || axiosErr.message);
                if (axiosErr.response?.data) {
                    return { success: false, error: axiosErr.response.data };
                }
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
        
        // Use rawBody directly if provided, otherwise fallback to stringify (less reliable)
        const bodyString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
        const computedMac = String(this.generateSignature(bodyString, config.secret_key)).trim().toLowerCase();
        const cleanIncomingMac = String(incomingMac).trim().toLowerCase();
        
        const isValid = (computedMac === cleanIncomingMac);
        if (!isValid) {
            console.error(`[Prismalink Webhook] ❌ MAC Signature Mismatch for ${bodyString.substring(0, 50)}...`);
        }

        return isValid;
    }
}

module.exports = new PrismalinkService();
