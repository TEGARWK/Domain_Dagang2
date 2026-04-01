const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

function getFormattedDate() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const sss = String(now.getMilliseconds()).padStart(3, '0');
    
    // Timezone offset in format +HHmm
    const offsetMinutes = -now.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const Z = `${sign}${String(offsetHours).padStart(2, '0')}${String(offsetMins).padStart(2, '0')}`;
    
    // Format: yyyy-MM-dd HH:mm:ss.SSS Z
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}.${sss} ${Z}`;
}

function formatPhoneNumber(phone) {
    if (!phone) return "+628123456789";
    let cleaned = phone.toString().replace(/\D/g, ''); 
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('62')) {
        // ok
    } else {
        cleaned = '62' + cleaned;
    }
    return '+' + cleaned;
}

const CONFIG = {
    merchant_id: (process.env.PRISMALINK_MERCHANT_ID || '').trim(),
    key_id: (process.env.PRISMALINK_KEY_ID || '').trim(),
    secret_key: (process.env.PRISMALINK_SECRET_KEY || '').trim(),
    base_url: (process.env.PRISMALINK_URL || 'https://api-staging.plink.co.id/gateway/v2').trim(),
    backend_url: (process.env.BACKEND_URL || '').trim()
};

const createPayment = async (data) => {
    try {

        
        const timestamp = getFormattedDate();
        const refNo = data.merchant_ref_no || `TRX-${Date.now()}`; 
        
        console.log(`[PrismaLink] Creating transaction for invoice: ${data.invoice_number}`);
        console.log(`[PrismaLink] Using Merchant ID: ${CONFIG.merchant_id}`);
        console.log(`[PrismaLink] Using Key ID (start...end): ${CONFIG.key_id.substring(0, 4)}...${CONFIG.key_id.substring(CONFIG.key_id.length - 4)}`);
        
        const items = (data.items || []).map(i => ({
            item_code: parseInt(i.id) || 0,
            item_title: (i.name || "Item").substring(0, 50),
            quantity: 1,
            total: (parseInt(i.price) || 0).toString(),
            currency: "IDR"
        }));

        const transactionAmount = parseInt(data.amount);
        const itemsSum = (data.items || []).reduce((acc, i) => acc + (parseInt(i.price) || 0), 0);

        if (transactionAmount > itemsSum) {
            items.push({
                item_code: 999,
                item_title: "Tax / PPN 11%",
                quantity: 1,
                total: (transactionAmount - itemsSum).toString(),
                currency: "IDR"
            });
        }

        const backendBase = CONFIG.backend_url; 
        const frontendBase = process.env.CLIENT_URL || 'http://localhost:5173';

        const registeredBackend = `${backendBase}/api/prismalink/webhook`;
        const registeredFrontend = `${frontendBase}/dashboard/billing`;

        const bankCodeInput = (data.bank_code || "").toUpperCase();
        let bankId = "BCA"; 
        let paymentMethod = data.payment_channel === 'QRIS' ? 'QR' : 'VA';

        const bankMap = {
            "BCA": "014", 
            "MANDIRI": "008", 
            "BRI": "002",
            "BNI": "009", 
            "PERMATA": "013", 
            "DANAMON": "011", 
            "CIMB": "022",
            "BSI": "BSI" 
        };
        


        if (paymentMethod === 'VA') {
            bankId = bankMap[bankCodeInput] || "014";
        } else {
            bankId = null;
        }

        const payloadObj = {
            merchant_key_id: CONFIG.key_id,
            merchant_id: CONFIG.merchant_id,
            merchant_ref_no: refNo,
            backend_callback_url: registeredBackend,
            frontend_callback_url: registeredFrontend,
            transaction_date_time: timestamp,
            transmission_date_time: timestamp,
            transaction_currency: "IDR",
            transaction_amount: Number(transactionAmount),
            product_details: JSON.stringify(items),
            user_id: (data.user_id || "7").toString(),
            user_name: (data.user_name || "Customer").substring(0, 50),
            user_email: (data.user_email || "customer@example.com").substring(0, 50),
            user_phone_number: formatPhoneNumber(data.user_phone),
            remarks: (data.remarks || "Sewa Domain").substring(0, 100),
            user_device_id: (data.user_device_id || "WEB-BROWSER").substring(0, 50),
            user_ip_address: data.user_ip_address, // Use passed IP directly, no more 127.0.0.1 fallback
            shipping_details: JSON.stringify({
                address: (data.user_address || "Alamat belum diatur").substring(0, 200),
                telephoneNumber: formatPhoneNumber(data.user_phone),
                handphoneNumber: formatPhoneNumber(data.user_phone)
            }),
            payment_method: paymentMethod,
            other_bills: "[]",
            invoice_number: data.invoice_number,
            integration_type: "02",
            external_id: `EXT-${Date.now()}`,
            action_id: "01"
        };

        // Important Debug: Log the final payload and signature before sending
        const rawBody = JSON.stringify(payloadObj);
        const signature = crypto.createHmac('sha256', CONFIG.secret_key)
            .update(rawBody)
            .digest('hex');

        console.log("[PrismaLink] Final Payload to be sent:", rawBody);
        console.log("[PrismaLink] Generated Signature (mac):", signature);





        const endpoint = `${CONFIG.base_url}/payment/integration/transaction/api/submit-trx`;

        try {
            const response = await axios.post(endpoint, rawBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'mac': signature
                }
            });
            const respData = response.data;
            console.log("[PrismaLink] Response Body:", JSON.stringify(respData, null, 2));
            const isSuccess = respData.response_code === 'PL000' || respData.response_code === '00';

            let resultData = {
                transaction_id: respData.transaction_id || respData.plink_ref_no || refNo,
                plink_ref_no: respData.plink_ref_no,
                amount: respData.transaction_amount || data.amount,
                expired_at: respData.expired_date_time || respData.validity || respData.valid_until || respData.expiry || null,
                payment_amount: respData.payment_amount || data.amount
            };

            // Mapping VA/QR results ...
            if (isSuccess) {
                if (paymentMethod === 'VA') {
                    if (respData.va_number_display) {
                        resultData.va_number = respData.va_number_display;
                    } else if (respData.va_number) {
                        resultData.va_number = respData.va_number;
                    } else if (respData.bill_code) {
                        resultData.va_number = respData.bill_code;
                    } else if (respData.va_number_list) { 
                        try {
                            const vaList = typeof respData.va_number_list === 'string' 
                                ? JSON.parse(respData.va_number_list) 
                                : respData.va_number_list;
                            if (Array.isArray(vaList) && vaList.length > 0) {
                                resultData.va_number = vaList[0].va || vaList[0].va_number;
                            }
                        } catch (e) {
                            console.error("Failed to parse va_number_list:", e);
                        }
                    }
                }
                if (paymentMethod === 'QR' || paymentMethod === 'QRIS') {
                    resultData.qr_string = respData.qris_data || respData.qr_string || respData.qr_code || respData.payment_url;
                }
            }

            return {
                success: isSuccess,
                data: resultData,
                raw: respData
            };
        } catch (apiError) {

            if (apiError.response) {

                

            } else {

            }
            throw apiError;
        }

    } catch (error) {

        throw error;
    }
};

const checkStatus = async (transactionId, plinkRefNo = null) => {
    try {
        const timestamp = getFormattedDate();
        const payload = {
            merchant_key_id: CONFIG.key_id,
            merchant_id: CONFIG.merchant_id,
            merchant_ref_no: transactionId,
            transmission_date_time: timestamp
        };

        if (plinkRefNo) payload.plink_ref_no = plinkRefNo;

        const rawBody = JSON.stringify(payload);
        const signature = crypto.createHmac('sha256', CONFIG.secret_key)
            .update(rawBody)
            .digest('hex');

        const response = await axios.post(`${CONFIG.base_url}/payment/integration/transaction/api/inquiry-transaction`, rawBody, {
            headers: { 'Content-Type': 'application/json', 'mac': signature }
        });

        return response.data;
    } catch (error) {
        console.error("[CheckStatus] Error:", error.message);
        return error.response ? error.response.data : { message: error.message };
    }
};

const validateSignature = (headers, body) => {
    try {
        const incomingMac = headers.mac || headers.MAC;
        if (!incomingMac) return false;
        const expectedMac = crypto.createHmac('sha256', CONFIG.secret_key)
            .update(JSON.stringify(body))
            .digest('hex');
        return incomingMac.toLowerCase() === expectedMac.toLowerCase();
    } catch (e) {
        return false;
    }
};

module.exports = {
    createPayment,
    checkStatus,
    validateSignature,
    CONFIG,
    getFormattedDate,
    formatPhoneNumber
};
