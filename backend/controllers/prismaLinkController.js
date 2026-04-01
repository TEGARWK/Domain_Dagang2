const db = require('../config/db');
const PrismaLinkService = require('../services/PrismaLinkService');
const { getIPv4 } = require('../utils/ipHelper');

/**
 * Membuat transaksi pembayaran baru via PrismaLink
 * Mendukung VA dan QRIS
 */
exports.createTransaction = async (req, res) => {
    try {
        const { invoice_number } = req.body;
        if (!invoice_number) {
            return res.status(400).json({ success: false, message: "Invoice number is required" });
        }

        // 1. Cek Invoice
        const invRes = await db.pool.query('SELECT * FROM invoices WHERE id = $1', [invoice_number]);
        const invoice = invRes.rows[0];

        if (!invoice) {
            return res.status(404).json({ success: false, message: "Invoice not found" });
        }

        if (invoice.status === 'PAID') {
            return res.status(400).json({ success: false, message: "Invoice is already paid" });
        }

        // 2. Ambil User & Items
        // Customer details
        const userRes = await db.pool.query(`SELECT * FROM users WHERE id = $1`, [invoice.user_id]);
        const user = userRes.rows[0] || {};
        
        // Invoice Items
        const itemsRes = await db.pool.query(`SELECT * FROM invoice_items WHERE invoice_id = $1`, [invoice_number]);
        const items = itemsRes.rows;

        // 3. Prepare Data for PrismaLink
        const userIP = getIPv4(req);
        console.log(`[DEBUG] Determined IP for PrismaLink: ${userIP}`);

        const paymentData = {
            invoice_number: invoice.id,
            amount: invoice.total,
            user_id: user.id || 0,
            user_name: user.name || "Customer",
            user_email: user.email || "customer@example.com",
            user_phone: user.phone || "08123456789",
            user_address: user.address || "Alamat belum diatur",
            user_ip_address: userIP,
            user_device_id: (req.headers['user-agent'] || "WEB-BROWSER").substring(0, 50),
            bank_code: req.body.bank_code || null,
            payment_channel: req.body.payment_channel || "VA",
            items: items.map(i => ({
                id: i.id,
                name: i.name,
                price: i.price
            }))
        };

        // 4. Call Service
        const result = await PrismaLinkService.createPayment(paymentData);

        if (!result.success) {
            // [FORCE-SYNC-V2] Ensuring this diagnostic fix is applied
            console.error("❌ PrismaLink API Rejected Request:", result.raw);
            return res.status(400).json({
                success: false,
                message: result.raw?.response_message || "Ditolak oleh PrismaLink",
                details: result.raw?.response_message || "Silakan periksa log server untuk detail teknis.",
                raw: result.raw
            });
        }

        // 5. Save Initial 'PENDING' state to DB
        const refNo = result.data.transaction_id || `TRX-${Date.now()}`;
        
        const vaNumber = result.data.va_number || null;
        const qrString = result.data.qr_string || null;
        const expiredAt = result.data.expired_at || null;

        try {
            const methodDetail = req.body.payment_channel === 'QRIS' ? 'QRIS' : `VA_${req.body.bank_code}`;

            await db.pool.query(`
                INSERT INTO payments (
                    invoice_number, 
                    transaction_id, 
                    amount, 
                    payment_method, 
                    status, 
                    raw_response, 
                    va_number, 
                    expired_at,
                    plink_ref_no
                )
                VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8)
                ON CONFLICT (transaction_id) DO UPDATE SET 
                    status = EXCLUDED.status,
                    raw_response = EXCLUDED.raw_response,
                    va_number = EXCLUDED.va_number,
                    expired_at = EXCLUDED.expired_at,
                    plink_ref_no = EXCLUDED.plink_ref_no,
                    updated_at = NOW()
            `, [
                invoice_number, 
                refNo, 
                invoice.total, 
                methodDetail,
                JSON.stringify(result.raw),
                vaNumber,
                expiredAt,
                result.data.plink_ref_no || null
            ]);
        } catch (dbErr) {
            console.error("❌ Failed to save payment record:", dbErr.message);
        }

        return res.status(200).json({
            success: result.success,
            message: result.success ? "Payment created successfully" : "Failed to create payment",
            data: result.data
        });

    } catch (error) {
        console.error("❌ PrismaLink Create Error (Controller):", error.message);
        if (error.response) {
            console.error("API Error Body:", error.response.data);
        }
        return res.status(error.status || 500).json({
            success: false,
            message: error.response?.data?.response_message || "Gagal membuat pembayaran ke PrismaLink",
            details: error.response?.data?.response_message || error.message
        });
    }
};

/**
 * Handle Webhook Notification dari PrismaLink
 */
exports.handleWebhook = async (req, res) => {
    try {
        console.log("🔔 [PrismaLink Webhook] Payload received:", JSON.stringify(req.body, null, 2));

        const isValid = PrismaLinkService.validateSignature(req.headers, req.body);
        if (!isValid) {
            console.warn("⚠️ [PrismaLink Webhook] Invalid Signature detected!");
            // return res.status(401).json({ success: false, message: "Invalid Signature" });
        }

        const { merchant_ref_no, transaction_status, plink_ref_no } = req.body;

        if (transaction_status === 'SETTLED' || transaction_status === 'SUCCESS') {
            const payRes = await db.pool.query('SELECT * FROM payments WHERE transaction_id = $1', [merchant_ref_no]);
            const payment = payRes.rows[0];

            if (payment && payment.status !== 'PAID') {
                await db.pool.query('BEGIN');

                await db.pool.query(
                    'UPDATE payments SET status = $1, updated_at = NOW() WHERE transaction_id = $2',
                    ['PAID', merchant_ref_no]
                );

                await db.pool.query(
                    'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2',
                    ['PAID', payment.invoice_number]
                );

                const invRes = await db.pool.query('SELECT * FROM invoices WHERE id = $1', [payment.invoice_number]);
                const invoice = invRes.rows[0];

                if (invoice && invoice.type === 'TOPUP') {
                    await db.pool.query(
                        'UPDATE users SET balance = balance + $1 WHERE id = $2',
                        [invoice.total, invoice.user_id]
                    );
                    
                    await db.pool.query(`
                        INSERT INTO audit_logs (user_id, action, details)
                        VALUES ($1, $2, $3)
                    `, [invoice.user_id, 'TOPUP_SUCCESS', `Wallet balance added via PrismaLink: ${invoice.total}`]);
                }

                await db.pool.query('COMMIT');
                console.log(`✅ [PrismaLink Webhook] Payment Successful for Invoice: ${payment.invoice_number}`);
            }
        }

        return res.status(200).json({ response_code: "PL000", response_message: "SUCCESS" });

    } catch (err) {
        console.error("❌ Webhook Error:", err.message);
        await db.pool.query('ROLLBACK');
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Handle Webhook Notification dari PrismaLink (Alternative style)
 */
exports.webhook = async (req, res) => {
    return exports.handleWebhook(req, res);
};

/**
 * Manual Inquiry ke PrismaLink
 */
exports.checkStatus = async (req, res) => {
    try {
        const { id } = req.params; 
        const payRes = await db.pool.query('SELECT * FROM payments WHERE id = $1', [id]);
        const payment = payRes.rows[0];

        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment record not found" });
        }

        const status = await PrismaLinkService.checkStatus(payment.transaction_id, payment.plink_ref_no);
        console.log(`[CheckStatus] Status from API:`, status);

        if (status.transaction_status === 'SETTLED' || status.transaction_status === 'SUCCESS') {
            if (payment.status !== 'PAID') {
                await db.pool.query('BEGIN');
                await db.pool.query('UPDATE payments SET status = $1 WHERE id = $2', ['PAID', id]);
                await db.pool.query('UPDATE invoices SET status = $1 WHERE id = $2', ['PAID', payment.invoice_number]);
                
                const invRes = await db.pool.query('SELECT * FROM invoices WHERE id = $1', [payment.invoice_number]);
                const invoice = invRes.rows[0];
                if (invoice && invoice.type === 'TOPUP') {
                    await db.pool.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [invoice.total, invoice.user_id]);
                }
                await db.pool.query('COMMIT');
            }
        }

        return res.status(200).json({ success: true, data: status });

    } catch (error) {
        console.error("Check Status Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};
