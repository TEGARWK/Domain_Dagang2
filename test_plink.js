const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config({ path: './backend/.env' });

const CONFIG = {
    merchant_id: process.env.PRISMALINK_MERCHANT_ID,
    key_id: process.env.PRISMALINK_KEY_ID,
    secret_key: process.env.PRISMALINK_SECRET_KEY,
    base_url: process.env.PRISMALINK_URL || 'https://api-staging.plink.co.id/gateway/v2'
};

async function testPayload(label, payload) {
    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', CONFIG.secret_key)
        .update(rawBody)
        .digest('hex');

    console.log(`\n--- Testing: ${label} ---`);
    try {
        const response = await axios.post(`${CONFIG.base_url}/payment/integration/transaction/api/submit-trx`, rawBody, {
            headers: {
                'Content-Type': 'application/json',
                'mac': signature
            }
        });
        console.log(`SUCCESS [${label}]:`, response.data.response_message);
    } catch (err) {
        console.log(`ERROR [${label}]:`, err.response?.data?.response_message || err.message);
        if (err.response?.data) console.log("Details:", JSON.stringify(err.response.data));
    }
}

const basePayload = {
    merchant_key_id: CONFIG.key_id,
    merchant_id: CONFIG.merchant_id,
    merchant_ref_no: "TEST-" + Date.now(),
    backend_callback_url: "https://example.com/callback",
    frontend_callback_url: "https://example.com/done",
    transaction_date_time: "2026-04-02 11:00:00.000 +0700",
    transmission_date_time: "2026-04-02 11:00:00.000 +0700",
    transaction_currency: "IDR",
    transaction_amount: 50000,
    product_details: JSON.stringify([{
        item_code: 1,
        item_title: "Test Item",
        quantity: 1,
        total: "50000",
        currency: "IDR"
    }]),
    user_id: "7",
    user_name: "Test User",
    user_email: "test@example.com",
    user_phone_number: "628123456789",
    remarks: "Test Transaction",
    user_device_id: "WEB",
    user_ip_address: "103.11.132.1",
    shipping_details: JSON.stringify({
        address: "Test Address",
        telephoneNumber: "628123456789",
        handphoneNumber: "628123456789"
    }),
    payment_method: "VA",
    bank_id: "014",
    other_bills: "[]",
    invoice_number: "INV-TEST-" + Date.now(),
    integration_type: "02",
    external_id: "EXT-" + Date.now(),
    action_id: "01"
};

async function run() {
    // 1. Base test
    await testPayload("Original Base", basePayload);

    // 2. Amount as String
    await testPayload("Amount as String", { ...basePayload, transaction_amount: "50000" });

    // 3. User ID as Number
    await testPayload("User ID as Number", { ...basePayload, user_id: 7 });

    // 4. Removing Shipping Details (Optional?)
    const { shipping_details, ...noShipping } = basePayload;
    await testPayload("No Shipping Details", noShipping);
}

run();
