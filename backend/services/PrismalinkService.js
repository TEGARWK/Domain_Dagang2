const crypto = require('crypto');
const axios = require('axios');
const db = require('../config/db');

class PrismalinkService {
    async getConfig() {
        try {
            const res = await db.pool.query("SELECT * FROM payment_gateways WHERE provider ILIKE 'prismalink' LIMIT 1");
            if (res.rows.length > 0) {
                const raw = res.rows[0];
                return {
                    key_id: raw.api_key,
                    merchant_id: raw.merchant_code,
                    secret_key: raw.private_key,
                    backend_callback: raw.webhook_url,
                    frontend_callback: raw.frontend_callback,
                    baseUrl: raw.api_url || "https://api-staging.plink.co.id/gateway/v2"
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
                     .digest('hex');
    }

    async createTransaction(orderData) {
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

            let phone = String(orderData.customer_phone || "08123456789").trim();
            if (phone.startsWith('0')) {
                phone = '+62' + phone.substring(1);
            } else if (!phone.startsWith('+')) {
                phone = '+' + phone;
            }

            const productDetails = (orderData.items || []).map((item, index) => ({
                item_code: `${orderData.order_id}-${index}`,
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
                merchant_ref_no: orderData.order_id,
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
                remarks: orderData.description || "Order Payment",
                user_device_id: String(Date.now()),
                user_ip_address: "127.0.0.1",
                shipping_details: JSON.stringify({ address: "Digital Product" }),
                payment_method: pMethod,
                bank_id: bId,
                other_bills: "[]",
                invoice_number: orderData.order_id,
                integration_type: "02",
                external_id: orderData.order_id
            };

            const bodyString = JSON.stringify(payload);
            const mac = this.generateSignature(bodyString, config.secret_key);

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

    async verifyWebhook(body, incomingMac) {
        const config = await this.getConfig();
        if (!config || !config.secret_key || !incomingMac) return false;
        const bodyString = JSON.stringify(body);
        const computedMac = this.generateSignature(bodyString, config.secret_key);
        return (computedMac === incomingMac);
    }
}

module.exports = new PrismalinkService();
